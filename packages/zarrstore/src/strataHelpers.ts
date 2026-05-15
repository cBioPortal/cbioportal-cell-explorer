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
