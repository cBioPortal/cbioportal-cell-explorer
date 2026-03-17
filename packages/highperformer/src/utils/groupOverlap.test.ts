import { describe, it, expect } from 'vitest'
import { computeOverlap, computeCrossOverlap } from './groupOverlap'
import type { SelectionGroup } from '../store/useAppStore'

function makeGroup(id: number, indices: number[]): SelectionGroup {
  return {
    id,
    type: 'rectangle',
    polygon: [],
    indices: new Uint32Array(indices),
    color: [255, 0, 0],
  }
}

describe('computeOverlap', () => {
  it('returns zeros for empty groups array', () => {
    const stats = computeOverlap([], 100)
    expect(stats.overlapCount).toBe(0)
    expect(stats.unionCount).toBe(0)
  })

  it('returns single group count with no overlap', () => {
    const stats = computeOverlap([makeGroup(1, [0, 1, 2])], 10)
    expect(stats.overlapCount).toBe(0)
    expect(stats.unionCount).toBe(3)
    expect(stats.uniqueCounts.get(1)).toBe(3)
  })

  it('computes overlap between two disjoint groups', () => {
    const stats = computeOverlap([
      makeGroup(1, [0, 1, 2]),
      makeGroup(2, [3, 4, 5]),
    ], 10)
    expect(stats.overlapCount).toBe(0)
    expect(stats.unionCount).toBe(6)
    expect(stats.uniqueCounts.get(1)).toBe(3)
    expect(stats.uniqueCounts.get(2)).toBe(3)
  })

  it('computes overlap between two groups with shared cells', () => {
    const stats = computeOverlap([
      makeGroup(1, [0, 1, 2, 3]),
      makeGroup(2, [2, 3, 4, 5]),
    ], 10)
    expect(stats.overlapCount).toBe(2)
    expect(stats.unionCount).toBe(6)
    expect(stats.uniqueCounts.get(1)).toBe(2)
    expect(stats.uniqueCounts.get(2)).toBe(2)
    expect(stats.pairwiseOverlaps.get('1-2')).toBe(2)
  })

  it('computes overlap among three groups', () => {
    const stats = computeOverlap([
      makeGroup(1, [0, 1, 2]),
      makeGroup(2, [1, 2, 3]),
      makeGroup(3, [2, 3, 4]),
    ], 10)
    // cell 0: only G1, cell 1: G1+G2, cell 2: G1+G2+G3, cell 3: G2+G3, cell 4: only G3
    expect(stats.uniqueCounts.get(1)).toBe(1) // cell 0
    expect(stats.uniqueCounts.get(3)).toBe(1) // cell 4
    expect(stats.unionCount).toBe(5)
    expect(stats.overlapCount).toBe(3) // cells 1, 2, 3
  })

  it('handles fully overlapping groups', () => {
    const stats = computeOverlap([
      makeGroup(1, [0, 1, 2]),
      makeGroup(2, [0, 1, 2]),
    ], 10)
    expect(stats.overlapCount).toBe(3)
    expect(stats.unionCount).toBe(3)
    expect(stats.uniqueCounts.get(1)).toBe(0)
    expect(stats.uniqueCounts.get(2)).toBe(0)
  })
})

describe('computeCrossOverlap', () => {
  it('returns empty map with no spatial groups', () => {
    const result = computeCrossOverlap([], { a: [0, 1] }, new Set(['a']), 10)
    expect(result.size).toBe(0)
  })

  it('returns empty map with no enabled custom IDs', () => {
    const result = computeCrossOverlap([makeGroup(1, [0, 1])], { a: [0, 1] }, new Set(), 10)
    expect(result.size).toBe(0)
  })

  it('returns empty map with zero totalCells', () => {
    const result = computeCrossOverlap([makeGroup(1, [0])], { a: [0] }, new Set(['a']), 0)
    expect(result.size).toBe(0)
  })

  it('computes intersection between one spatial group and custom group', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [0, 1, 2, 3])],
      { a: [1, 2], b: [4, 5] },
      new Set(['a', 'b']),
      10,
    )
    // G1 has cells 0,1,2,3. Custom has cells 1,2,4,5. Intersection = cells 1,2
    expect(result.get(1)).toBe(2)
  })

  it('computes intersection for multiple spatial groups', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [0, 1, 2]), makeGroup(2, [3, 4, 5])],
      { a: [1, 2, 3, 4] },
      new Set(['a']),
      10,
    )
    // G1 ∩ Custom = cells 1,2 → 2
    // G2 ∩ Custom = cells 3,4 → 2
    expect(result.get(1)).toBe(2)
    expect(result.get(2)).toBe(2)
  })

  it('returns zero for no overlap', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [0, 1, 2])],
      { a: [3, 4, 5] },
      new Set(['a']),
      10,
    )
    expect(result.get(1)).toBe(0)
  })

  it('returns full count when spatial group is subset of custom group', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [1, 2, 3])],
      { a: [0, 1, 2, 3, 4, 5] },
      new Set(['a']),
      10,
    )
    expect(result.get(1)).toBe(3)
  })

  it('only includes enabled custom IDs', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [0, 1, 2, 3])],
      { a: [0, 1], b: [2, 3] },
      new Set(['a']), // only 'a' enabled
      10,
    )
    // Only cells 0,1 are in custom mask. G1 has 0,1,2,3. Intersection = 0,1
    expect(result.get(1)).toBe(2)
  })

  it('handles missing keys in indexMap gracefully', () => {
    const result = computeCrossOverlap(
      [makeGroup(1, [0, 1])],
      { a: [0] },
      new Set(['a', 'nonexistent']),
      10,
    )
    expect(result.get(1)).toBe(1)
  })
})
