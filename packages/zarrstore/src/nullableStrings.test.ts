import { describe, it, expect, vi } from "vitest";
import * as zarr from "zarrita";
import { AnnDataStore } from "./AnnDataStore";
import { decodeNode } from "./decoders";
import type { MeasureDetail } from "./ProfileCollector";

const NULLABLE_URL = `${globalThis.__TEST_BASE_URL__}/nullable-strings.zarr`;
const CELLS = ["cell_0", "cell_1", "cell_2", "cell_3", "cell_4", "cell_5"];

describe("nullable-string-array stores", () => {
  it("reads a nullable string column, with missing values as null", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    expect(await adata.obsColumn("donor")).toEqual(["d1", null, "d2", "d1", null, "d2"]);
  });

  it("reads the obs dataframe with a nullable index and nullable columns", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    const obs = await adata.obs();
    expect(obs.index).toEqual(CELLS);
    expect(obs.columns.donor).toEqual(["d1", null, "d2", "d1", null, "d2"]);
    expect(obs.columns.cell_type).toEqual(["T", "B", "T", "B", "T", "B"]);
  });

  it("reads the var dataframe with a nullable index", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    expect((await adata.var()).index).toEqual(["gene_0", "gene_1", "gene_2"]);
  });

  it("masks missing values in a nullable integer column", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    expect(await adata.obsColumn("count")).toEqual([1, null, 3, 4, null, 6]);
  });

  it("reads obs and var names from nullable indexes", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    expect(await adata.obsNames()).toEqual(CELLS);
    expect(await adata.varNames()).toEqual(["gene_0", "gene_1", "gene_2"]);
  });

  it("reports chunk info for a nullable index to the profiler", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    await adata.obsNames();
    const measures = performance
      .getEntriesByType("measure")
      .map((e) => (e as PerformanceMeasure).detail as MeasureDetail | undefined)
      .filter((d) => d?.key === "obsNames");
    expect(measures.at(-1)?.chunks?.arrayShape).toEqual([6]);
  });

  it("reports chunk info for a nullable string column to the profiler", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    await adata.obsColumn("donor");
    const measures = performance
      .getEntriesByType("measure")
      .map((e) => (e as PerformanceMeasure).detail as MeasureDetail | undefined)
      .filter((d) => d?.key === "obs:donor");
    expect(measures.at(-1)?.chunks?.arrayShape).toEqual([6]);
  });

  it("keeps values when nothing is masked and nulls only masked positions otherwise", async () => {
    const adata = await AnnDataStore.open(NULLABLE_URL);
    // obs/_index has an all-false mask, obs/donor a partial one
    const names = await adata.obsNames();
    expect(names).toEqual(CELLS);
    expect(names.every((n) => n !== null)).toBe(true);
    expect(await adata.obsColumn("donor")).toEqual(["d1", null, "d2", "d1", null, "d2"]);
  });

  it("does not probe for a group when reading a plain-array index on a v2 store", async () => {
    const adata = await AnnDataStore.open(`${globalThis.__TEST_BASE_URL__}/pbmc3k.zarr`);
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      await adata.obsNames();
      const urls = spy.mock.calls.map((c) => String(c[0] instanceof Request ? c[0].url : c[0]));
      expect(urls.filter((u) => u.endsWith(".zgroup"))).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it("does not probe for a group when reading a plain-array column on a v2 store", async () => {
    const adata = await AnnDataStore.open(`${globalThis.__TEST_BASE_URL__}/pbmc3k.zarr`);
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      await adata.obsColumn("n_genes");
      const urls = spy.mock.calls.map((c) => String(c[0] instanceof Request ? c[0].url : c[0]));
      expect(urls.filter((u) => u.endsWith(".zgroup"))).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it("decodes a nullable-string-array node reached through decodeNode", async () => {
    const root = await zarr.open(new zarr.FetchStore(NULLABLE_URL), { kind: "group" });
    const node = await zarr.open(root.resolve("obs/donor"), { kind: "group" });
    const result = (await decodeNode(node)) as { values: unknown[]; mask: ArrayLike<number> };
    expect(result.values).toEqual(["d1", null, "d2", "d1", null, "d2"]);
    expect(Array.from(result.mask as ArrayLike<unknown>, Number)).toEqual([0, 1, 0, 0, 1, 0]);
  });
});
