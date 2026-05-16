import { describe, it, expect } from "vitest";
import type { StrataTable } from "./StrataStore";
import { strataMeans, strataFracExpressing, strataVariances, dotplotData } from "./strataHelpers";

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

describe("strataVariances", () => {
  it("computes sample variance: (sum_xx - sum_x^2 / n) / (n - 1)", () => {
    // stratum 0: 4 cells, gene 0 values [1, 2, 3, 4]
    //   sum_x = 10, sum_xx = 1+4+9+16 = 30, n=4
    //   variance = (30 - 100/4) / 3 = (30 - 25) / 3 = 5/3 ≈ 1.6666...
    const table = makeTable(1, 1, [10], [4]);
    table.sumXX.set([30]);
    const out = strataVariances(table);
    expect(out[0]).toBeCloseTo(5 / 3, 6);
  });

  it("returns 0 for strata with 0 or 1 cells (variance undefined / zero)", () => {
    const t0 = makeTable(1, 1, [0], [0]);
    expect(strataVariances(t0)[0]).toBe(0);
    const t1 = makeTable(1, 1, [5], [1]);
    t1.sumXX.set([25]);
    expect(strataVariances(t1)[0]).toBe(0);
  });
});

describe("dotplotData", () => {
  it("returns means and fracExpressing for the requested genes", () => {
    // 2 strata × 3 underlying genes; select columns 0 and 2.
    const table = makeTable(2, 3, [10, 20, 30, 8, 12, 16], [10, 4]);
    table.nnz.set([10, 5, 8, 4, 2, 4]);

    const result = dotplotData(table, [0, 2]);

    // means stratum 0: [10/10, 30/10] = [1, 3]
    // means stratum 1: [8/4,   16/4]  = [2, 4]
    expect(Array.from(result.means)).toEqual([1, 3, 2, 4]);

    // fracExpressing stratum 0: [10/10, 8/10] = [1, 0.8]
    // fracExpressing stratum 1: [4/4,   4/4]  = [1, 1]
    const frac = Array.from(result.fracExpressing);
    expect(frac[0]).toBeCloseTo(1, 6);
    expect(frac[1]).toBeCloseTo(0.8, 6);
    expect(frac[2]).toBeCloseTo(1, 6);
    expect(frac[3]).toBeCloseTo(1, 6);
  });

  it("returns empty arrays for empty geneIndices", () => {
    const table = makeTable(2, 3, [10, 20, 30, 8, 12, 16], [10, 4]);
    const result = dotplotData(table, []);
    expect(result.means.length).toBe(0);
    expect(result.fracExpressing.length).toBe(0);
  });
});
