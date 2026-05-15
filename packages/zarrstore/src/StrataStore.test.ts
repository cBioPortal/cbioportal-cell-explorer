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
