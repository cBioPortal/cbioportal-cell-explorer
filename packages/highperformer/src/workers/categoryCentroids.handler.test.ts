import { describe, it, expect } from "vitest";
import { computeCategoryCentroids } from "./categoryCentroids.handler";

describe("computeCategoryCentroids", () => {
  it("computes the mean of points per category", () => {
    // Two categories: code 0 has points (0,0), (2,0); code 1 has points (10,10), (20,20).
    const positions = new Float32Array([0, 0, 2, 0, 10, 10, 20, 20]);
    const codes = new Uint8Array([0, 0, 1, 1]);

    const result = computeCategoryCentroids(positions, codes, 2);

    expect(Array.from(result.positions)).toEqual([1, 0, 15, 15]);
    expect(Array.from(result.counts)).toEqual([2, 2]);
  });

  it("leaves empty categories at (0, 0) with count 0", () => {
    const positions = new Float32Array([5, 5]);
    const codes = new Uint8Array([0]);

    const result = computeCategoryCentroids(positions, codes, 3);

    expect(Array.from(result.positions)).toEqual([5, 5, 0, 0, 0, 0]);
    expect(Array.from(result.counts)).toEqual([1, 0, 0]);
  });

  it("handles a single-category degenerate case", () => {
    const positions = new Float32Array([1, 2, 3, 4, 5, 6]);
    const codes = new Uint8Array([0, 0, 0]);

    const result = computeCategoryCentroids(positions, codes, 1);

    expect(result.positions[0]).toBeCloseTo(3);
    expect(result.positions[1]).toBeCloseTo(4);
    expect(result.counts[0]).toBe(3);
  });

  it("uses Float64 accumulators to avoid drift on a million-point input", () => {
    // 1M points, code 0, all at (1e6, 1e6). Float32 sum would lose precision.
    const numPoints = 1_000_000;
    const positions = new Float32Array(2 * numPoints);
    const codes = new Uint8Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      positions[2 * i]     = 1e6;
      positions[2 * i + 1] = 1e6;
    }

    const result = computeCategoryCentroids(positions, codes, 1);

    // Mean should be exactly 1e6 — within Float32 representation tolerance.
    expect(result.positions[0]).toBeCloseTo(1e6, 0);
    expect(result.positions[1]).toBeCloseTo(1e6, 0);
    expect(result.counts[0]).toBe(numPoints);
  });

  it("matches a reference loop on randomized input", () => {
    const rng = mulberry32(42);
    const numPoints = 10_000;
    const numCategories = 5;
    const positions = new Float32Array(2 * numPoints);
    const codes = new Uint8Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      positions[2 * i]     = rng() * 100;
      positions[2 * i + 1] = rng() * 100;
      codes[i] = Math.floor(rng() * numCategories);
    }

    const result = computeCategoryCentroids(positions, codes, numCategories);

    // Reference loop: same algorithm, used to detect implementation regressions.
    const refSumX = new Float64Array(numCategories);
    const refSumY = new Float64Array(numCategories);
    const refCounts = new Uint32Array(numCategories);
    for (let i = 0; i < numPoints; i++) {
      const c = codes[i];
      refSumX[c] += positions[2 * i];
      refSumY[c] += positions[2 * i + 1];
      refCounts[c] += 1;
    }
    for (let c = 0; c < numCategories; c++) {
      if (refCounts[c] === 0) continue;
      expect(result.positions[2 * c]).toBeCloseTo(refSumX[c] / refCounts[c], 4);
      expect(result.positions[2 * c + 1]).toBeCloseTo(refSumY[c] / refCounts[c], 4);
      expect(result.counts[c]).toBe(refCounts[c]);
    }
  });
});

// Deterministic seeded RNG for reproducible randomized tests.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
