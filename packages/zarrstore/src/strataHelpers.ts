import type { StrataTable } from "./StrataStore";

/**
 * Per-(stratum, gene) mean expression. Returns a row-major (nStrata × geneCount)
 * Float32Array. Strata with nCells=0 produce 0 (not NaN).
 */
export function strataMeans(table: StrataTable): Float32Array {
  const nStrata = table.nCells.length;
  const geneCount = table.geneIndices?.length ?? table.sumX.length / nStrata;
  const out = new Float32Array(table.sumX.length);
  for (let row = 0; row < nStrata; row++) {
    const n = table.nCells[row];
    if (n === 0) {
      // 0 cells -> mean is 0 by convention (already zeroed)
      continue;
    }
    const base = row * geneCount;
    for (let j = 0; j < geneCount; j++) {
      out[base + j] = table.sumX[base + j] / n;
    }
  }
  return out;
}

/**
 * Per-(stratum, gene) fraction of cells with nonzero expression. nnz / nCells.
 * Returns a row-major (nStrata × geneCount) Float32Array. Strata with nCells=0
 * produce 0.
 */
export function strataFracExpressing(table: StrataTable): Float32Array {
  const nStrata = table.nCells.length;
  const geneCount = table.geneIndices?.length ?? table.nnz.length / nStrata;
  const out = new Float32Array(table.nnz.length);
  for (let row = 0; row < nStrata; row++) {
    const n = table.nCells[row];
    if (n === 0) continue;
    const base = row * geneCount;
    for (let j = 0; j < geneCount; j++) {
      out[base + j] = table.nnz[base + j] / n;
    }
  }
  return out;
}

/**
 * Per-(stratum, gene) sample variance: (sum_xx - sum_x^2 / n) / (n - 1).
 * Returns a row-major (nStrata × geneCount) Float32Array.
 *
 * Edge cases:
 * - n == 0: variance is 0 (undefined → conventional zero)
 * - n == 1: variance is 0 (sample variance with single observation)
 *
 * Numerical note: the (sum_xx - sum_x^2/n) form can suffer cancellation when
 * sums are large and variance is small. Acceptable for v1 — strata tables hold
 * float32 sums and consumers are visualizing aggregates, not running stats.
 */
export function strataVariances(table: StrataTable): Float32Array {
  const nStrata = table.nCells.length;
  const geneCount = table.geneIndices?.length ?? table.sumX.length / nStrata;
  const out = new Float32Array(table.sumX.length);
  for (let row = 0; row < nStrata; row++) {
    const n = table.nCells[row];
    if (n < 2) continue;
    const base = row * geneCount;
    const denom = n - 1;
    for (let j = 0; j < geneCount; j++) {
      const sx = table.sumX[base + j];
      const sxx = table.sumXX[base + j];
      out[base + j] = (sxx - (sx * sx) / n) / denom;
    }
  }
  return out;
}

/**
 * Convenience for the dotplot use case: returns (means, fracExpressing) for a
 * specific set of genes from a full StrataTable.
 *
 * The returned arrays are (nStrata × geneIndices.length) row-major Float32.
 * Note: this is for slicing an *already-loaded* full StrataTable by gene index.
 * It does NOT re-fetch the underlying data.
 */
export function dotplotData(
  table: StrataTable,
  geneIndices: number[],
): { means: Float32Array; fracExpressing: Float32Array } {
  const nStrata = table.nCells.length;
  const sourceGeneCount = table.geneIndices?.length ?? table.sumX.length / nStrata;
  const means = new Float32Array(nStrata * geneIndices.length);
  const fracExpressing = new Float32Array(nStrata * geneIndices.length);
  for (let row = 0; row < nStrata; row++) {
    const n = table.nCells[row];
    if (n === 0) continue;
    const srcBase = row * sourceGeneCount;
    const dstBase = row * geneIndices.length;
    for (let k = 0; k < geneIndices.length; k++) {
      const srcCol = geneIndices[k];
      means[dstBase + k] = table.sumX[srcBase + srcCol] / n;
      fracExpressing[dstBase + k] = table.nnz[srcBase + srcCol] / n;
    }
  }
  return { means, fracExpressing };
}
