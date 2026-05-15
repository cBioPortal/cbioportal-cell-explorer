import { describe, it, expect } from "vitest";
import type { StrataTable } from "./StrataStore";
import { strataMeans, strataFracExpressing } from "./strataHelpers";

function makeTable(
  nStrata: number,
  nGenes: number,
  sumX: number[],
  nCells: number[],
): StrataTable {
  return {
    kind: "coarse",
    slug: "test",
    axes: ["axis"],
    stratumKeys: Array.from({ length: nStrata }, (_, i) => [`s${i}`]),
    geneIndices: null,
    sumX: new Float32Array(sumX),
    sumXX: new Float32Array(sumX.length).fill(0),
    nnz: new Int32Array(sumX.length).fill(0),
    nCells: new Int32Array(nCells),
    schemaVersion: "1.0",
  };
}

describe("strataMeans", () => {
  it("computes sumX / nCells per row", () => {
    // 2 strata × 3 genes
    // stratum 0: nCells=10, sums=[10, 20, 30] -> means=[1, 2, 3]
    // stratum 1: nCells=4,  sums=[8,  12, 16] -> means=[2, 3, 4]
    const table = makeTable(2, 3, [10, 20, 30, 8, 12, 16], [10, 4]);
    const means = strataMeans(table);
    expect(Array.from(means)).toEqual([1, 2, 3, 2, 3, 4]);
  });

  it("returns 0 for strata with 0 cells (no NaN propagation)", () => {
    const table = makeTable(1, 2, [0, 0], [0]);
    const means = strataMeans(table);
    expect(Array.from(means)).toEqual([0, 0]);
  });
});

describe("strataFracExpressing", () => {
  it("computes nnz / nCells per row", () => {
    const table = makeTable(2, 3, [0, 0, 0, 0, 0, 0], [10, 4]);
    table.nnz.set([5, 0, 10, 1, 2, 4]);
    // stratum 0: 5/10, 0/10, 10/10 -> 0.5, 0, 1
    // stratum 1: 1/4, 2/4, 4/4     -> 0.25, 0.5, 1
    const out = strataFracExpressing(table);
    expect(Array.from(out)).toEqual([0.5, 0, 1, 0.25, 0.5, 1]);
  });

  it("returns 0 for strata with 0 cells", () => {
    const table = makeTable(1, 2, [0, 0], [0]);
    table.nnz.set([0, 0]);
    expect(Array.from(strataFracExpressing(table))).toEqual([0, 0]);
  });
});
