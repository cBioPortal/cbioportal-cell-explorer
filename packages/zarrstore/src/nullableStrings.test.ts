import { describe, it, expect } from "vitest";
import { AnnDataStore } from "./AnnDataStore";

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
});
