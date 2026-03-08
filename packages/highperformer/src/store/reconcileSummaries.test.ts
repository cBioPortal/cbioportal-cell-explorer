import { describe, it, expect, vi } from 'vitest'
import { reconcileSummaries, buildRequiredPairs } from './reconcileSummaries'

describe('buildRequiredPairs', () => {
  it('returns empty array when no variables or groups', () => {
    const pairs = buildRequiredPairs(
      new Map(),
      new Map(),
      new Map(),
      [],
    )
    expect(pairs).toEqual([])
  })

  it('builds pairs for every variable x every group', () => {
    const obsData = new Map([
      ['dataset', { codes: new Uint8Array(10), categoryMap: [{ label: 'A', color: [0, 0, 0] as [number, number, number] }] }],
    ])
    const geneData = new Map([
      ['GENE1', new Float32Array(10)],
    ])
    const groups = [
      { id: -1, indices: new Uint32Array(10) },
      { id: 1, indices: new Uint32Array(5) },
    ]

    const pairs = buildRequiredPairs(obsData, new Map(), geneData, groups)

    expect(pairs).toHaveLength(4) // 2 variables x 2 groups
    expect(pairs).toContainEqual(expect.objectContaining({ key: 'cat:dataset', groupId: -1 }))
    expect(pairs).toContainEqual(expect.objectContaining({ key: 'cat:dataset', groupId: 1 }))
    expect(pairs).toContainEqual(expect.objectContaining({ key: 'expr:GENE1', groupId: -1 }))
    expect(pairs).toContainEqual(expect.objectContaining({ key: 'expr:GENE1', groupId: 1 }))
  })

  it('skips groups with empty indices', () => {
    const geneData = new Map([['GENE1', new Float32Array(10)]])
    const groups = [
      { id: 1, indices: new Uint32Array(5) },
      { id: 2, indices: new Uint32Array(0) },
    ]

    const pairs = buildRequiredPairs(new Map(), new Map(), geneData, groups)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].groupId).toBe(1)
  })

  it('handles continuous obs data', () => {
    const contData = new Map([['sample_id', new Float32Array(10)]])
    const groups = [{ id: -1, indices: new Uint32Array(10) }]

    const pairs = buildRequiredPairs(new Map(), contData, new Map(), groups)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].key).toBe('expr:sample_id')
  })
})

describe('reconcileSummaries', () => {
  it('dispatches only missing pairs', () => {
    const dispatchFn = vi.fn()
    const cache = new Map<string, Map<number, unknown>>()
    // Pre-cache one result
    cache.set('cat:dataset', new Map([[-1, new Uint32Array(3)]]))

    const pairs = [
      { key: 'cat:dataset', groupId: -1, type: 'category' as const, codes: new Uint8Array(10), numCategories: 3, indices: new Uint32Array(10) },
      { key: 'cat:dataset', groupId: 1, type: 'category' as const, codes: new Uint8Array(10), numCategories: 3, indices: new Uint32Array(5) },
    ]

    reconcileSummaries(pairs, cache, dispatchFn)

    expect(dispatchFn).toHaveBeenCalledTimes(1)
    expect(dispatchFn).toHaveBeenCalledWith(expect.objectContaining({ groupId: 1 }))
  })

  it('prunes cache entries for removed groups', () => {
    const dispatchFn = vi.fn()
    const cache = new Map<string, Map<number, unknown>>()
    cache.set('cat:dataset', new Map([[-1, new Uint32Array(3)], [1, new Uint32Array(3)], [2, new Uint32Array(3)]]))

    const pairs = [
      { key: 'cat:dataset', groupId: -1, type: 'category' as const, codes: new Uint8Array(10), numCategories: 3, indices: new Uint32Array(10) },
      { key: 'cat:dataset', groupId: 1, type: 'category' as const, codes: new Uint8Array(10), numCategories: 3, indices: new Uint32Array(5) },
    ]

    reconcileSummaries(pairs, cache, dispatchFn)

    expect(cache.get('cat:dataset')!.has(2)).toBe(false)
    expect(dispatchFn).not.toHaveBeenCalled()
  })

  it('prunes entire variable when removed', () => {
    const dispatchFn = vi.fn()
    const cache = new Map<string, Map<number, unknown>>()
    cache.set('cat:dataset', new Map([[-1, new Uint32Array(3)]]))
    cache.set('expr:GENE1', new Map([[-1, {} as unknown]]))

    const pairs = [
      { key: 'cat:dataset', groupId: -1, type: 'category' as const, codes: new Uint8Array(10), numCategories: 3, indices: new Uint32Array(10) },
    ]

    reconcileSummaries(pairs, cache, dispatchFn)

    expect(cache.has('expr:GENE1')).toBe(false)
    expect(dispatchFn).not.toHaveBeenCalled()
  })
})
