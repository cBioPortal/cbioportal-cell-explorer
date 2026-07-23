import type { CategoryCentroidsResult } from "./categoryCentroids.schemas";

/**
 * Compute per-category mean centroid (x, y) and point count over a flat
 * position buffer and per-point category code array.
 *
 * Uses Float64 accumulators to avoid precision drift over millions of
 * points, then narrows to Float32 for the output (deck.gl prefers
 * Float32 attribute buffers).
 *
 * Empty categories (count = 0) are left at (0, 0); callers should filter
 * by `counts[code] > 0` before rendering.
 */
export function computeCategoryCentroids(
  positions: Float32Array,
  codes: Uint16Array,
  numCategories: number,
): CategoryCentroidsResult {
  const numPoints = codes.length;
  const sumX = new Float64Array(numCategories);
  const sumY = new Float64Array(numCategories);
  const counts = new Uint32Array(numCategories);

  for (let i = 0; i < numPoints; i++) {
    const code = codes[i];
    sumX[code] += positions[2 * i];
    sumY[code] += positions[2 * i + 1];
    counts[code] += 1;
  }

  const centroidPositions = new Float32Array(2 * numCategories);
  for (let c = 0; c < numCategories; c++) {
    if (counts[c] > 0) {
      centroidPositions[2 * c]     = sumX[c] / counts[c];
      centroidPositions[2 * c + 1] = sumY[c] / counts[c];
    }
  }

  return {
    type: "categoryCentroidsResult",
    positions: centroidPositions,
    counts,
  };
}
