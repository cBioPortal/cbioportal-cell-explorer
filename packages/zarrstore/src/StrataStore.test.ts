import { describe, it, expect } from "vitest";
import type {
  StrataTable,
  CoarseStrataTable,
  AtomicStrataTable,
} from "./StrataStore";
import { StrataStore } from "./StrataStore";
import { ZarrStore } from "./ZarrStore";

const FIXTURE = `${globalThis.__TEST_BASE_URL__}/strata-tiny.zarr`;

describe("StrataStore type definitions", () => {
  it("exports a StrataTable union resolvable to coarse or atomic", () => {
    const coarse: CoarseStrataTable = {
      kind: "coarse",
      slug: "cell_type",
      axes: ["cell_type"],
      stratumKeys: [["A"], ["B"]],
      geneIndices: null,
      sumX: new Float32Array([1, 2, 3, 4]),
      sumXX: new Float32Array([1, 4, 9, 16]),
      nnz: new Int32Array([1, 1, 1, 1]),
      nCells: new Int32Array([2, 2]),
      schemaVersion: "1.0",
    };
    const table: StrataTable = coarse;
    expect(table.kind).toBe("coarse");
  });

  it("exports StrataStore as a class", () => {
    expect(StrataStore).toBeDefined();
    expect(typeof StrataStore).toBe("function");
  });
});

describe("StrataStore — discovery", () => {
  it("hasAtomic + atomicAxes + atomicStrataCount", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    expect(strata.hasAtomic()).toBe(true);
    expect(strata.atomicAxes()).toEqual(["cell_type", "donor"]);
    expect(strata.atomicStrataCount()).toBe(6);
  });

  it("coarseSlugs + coarseAxes + coarseStrataCount", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    expect(strata.coarseSlugs()).toEqual(["cell_type"]);
    expect(strata.coarseAxes("cell_type")).toEqual(["cell_type"]);
    expect(strata.coarseStrataCount("cell_type")).toBe(3);
  });

  it("coarseAxes throws on unknown slug", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    expect(() => strata.coarseAxes("no_such_slug")).toThrow(/no_such_slug/);
  });

  it("returns empty discovery on a store without strata", async () => {
    const zs = await ZarrStore.open(`${globalThis.__TEST_BASE_URL__}/pbmc3k.zarr`);
    const strata = await StrataStore.fromZarrStore(zs);
    expect(strata.hasAtomic()).toBe(false);
    expect(strata.atomicAxes()).toBeNull();
    expect(strata.atomicStrataCount()).toBeNull();
    expect(strata.coarseSlugs()).toEqual([]);
  });
});

describe("StrataStore — readCoarse", () => {
  it("reads a coarse table with the expected shape and values", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const coarse = await strata.readCoarse("cell_type");

    expect(coarse.kind).toBe("coarse");
    expect(coarse.slug).toBe("cell_type");
    expect(coarse.axes).toEqual(["cell_type"]);
    expect(coarse.geneIndices).toBeNull();
    expect(coarse.schemaVersion).toBe("1.0");

    // 3 strata × 10 genes
    expect(coarse.stratumKeys.length).toBe(3);
    expect(coarse.sumX.length).toBe(30);
    expect(coarse.sumXX.length).toBe(30);
    expect(coarse.nnz.length).toBe(30);
    expect(coarse.nCells.length).toBe(3);

    // Cell counts: 20 (A) + 20 (B) + 10 (C) = 50
    const totalCells = Array.from(coarse.nCells).reduce((a, b) => a + b, 0);
    expect(totalCells).toBe(50);

    // Stratum keys are 1-axis -> each row is a 1-element array
    const flatKeys = coarse.stratumKeys.map((row) => row[0]).sort();
    expect(flatKeys).toEqual(["A", "B", "C"]);
  });

  it("dedupes concurrent calls (returns the same Promise)", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const p1 = strata.readCoarse("cell_type");
    const p2 = strata.readCoarse("cell_type");
    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
  });

  it("readCoarse throws synchronously on unknown slug", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    expect(() => strata.readCoarse("no_such_slug")).toThrow(/no_such_slug/);
  });
});

describe("StrataStore — readAtomicGenes", () => {
  it("reads a gene slice with the requested column order", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const atomic = await strata.readAtomicGenes([0, 5, 9]);

    expect(atomic.kind).toBe("atomic");
    expect(atomic.axes).toEqual(["cell_type", "donor"]);
    expect(atomic.geneIndices).toEqual([0, 5, 9]);
    // 6 strata × 3 selected genes
    expect(atomic.sumX.length).toBe(18);
    expect(atomic.nCells.length).toBe(6);
    expect(atomic.stratumKeys.length).toBe(6);
  });

  it("readAtomicGenes([]) returns empty arrays without fetching", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const atomic = await strata.readAtomicGenes([]);

    expect(atomic.kind).toBe("atomic");
    expect(atomic.geneIndices).toEqual([]);
    expect(atomic.sumX.length).toBe(0);
    expect(atomic.nCells.length).toBe(6);
    // stratumKeys + nCells are still populated even when geneIndices is empty
    expect(atomic.stratumKeys.length).toBe(6);
  });

  it("readAtomicGenes throws when no atomic exists", async () => {
    const zs = await ZarrStore.open(`${globalThis.__TEST_BASE_URL__}/pbmc3k.zarr`);
    const strata = await StrataStore.fromZarrStore(zs);
    await expect(strata.readAtomicGenes([0])).rejects.toThrow(/no atomic/i);
  });
});

describe("StrataStore — readAtomic (whole table)", () => {
  it("reads the full atomic table", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);
    const atomic = await strata.readAtomic();

    expect(atomic.kind).toBe("atomic");
    expect(atomic.geneIndices).toBeNull();
    expect(atomic.axes).toEqual(["cell_type", "donor"]);
    // 6 strata × 10 genes
    expect(atomic.sumX.length).toBe(60);
    expect(atomic.nCells.length).toBe(6);
    // Total cells across atomic == 50
    const total = Array.from(atomic.nCells).reduce((a, b) => a + b, 0);
    expect(total).toBe(50);
  });

  it("readAtomic throws when no atomic exists", async () => {
    const zs = await ZarrStore.open(`${globalThis.__TEST_BASE_URL__}/pbmc3k.zarr`);
    const strata = await StrataStore.fromZarrStore(zs);
    await expect(strata.readAtomic()).rejects.toThrow(/no atomic/i);
  });
});

describe("StrataStore — abort behavior", () => {
  it("settled cache entries are reused even when a new AbortSignal is passed", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);

    const firstP = strata.readCoarse("cell_type");
    await firstP;

    // Settled cache: a new call with a signal returns the SAME cached Promise.
    const ctrl = new AbortController();
    const secondP = strata.readCoarse("cell_type", ctrl.signal);
    expect(secondP).toBe(firstP);
    await secondP;
  });

  it("in-flight cache entries are evicted when a new AbortSignal is passed", async () => {
    const zs = await ZarrStore.open(FIXTURE);
    const strata = await StrataStore.fromZarrStore(zs);

    // Start a read but don't await — it stays in-flight in cache.
    const firstP = strata.readCoarse("cell_type");
    // While in-flight, a call with a signal evicts and re-fetches.
    const ctrl = new AbortController();
    const secondP = strata.readCoarse("cell_type", ctrl.signal);
    expect(secondP).not.toBe(firstP);
    await Promise.all([firstP, secondP]);
  });
});
