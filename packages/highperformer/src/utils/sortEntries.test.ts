import { describe, it, expect } from 'vitest'
import { compareByName, compareByCollection, makeShapeComparator } from './sortEntries'
import type { DatasetEntry } from './datasetEntries'
import type { ProbeResult } from '../hooks/useDatasetProbes'

const entry = (over: Partial<DatasetEntry> & { key: string; name: string }): DatasetEntry => ({
  kind: 'catalog',
  description: null,
  url: null,
  isPublic: true,
  ...over,
})

const BIG = entry({ key: 'big', name: 'Zebra atlas', collectionName: 'Lung' })
const MID = entry({ key: 'mid', name: 'apple atlas', collectionName: 'Breast' })
const UNKNOWN = entry({ key: 'unknown', name: 'Mystery', collectionName: null })

const probes = new Map<string, ProbeResult>([
  ['big', { status: 'ok', shape: { nObs: 900_000, nVar: 30_000 } }],
  ['mid', { status: 'ok', shape: { nObs: 2_700, nVar: 33_000 } }],
  ['unknown', { status: 'pending' }],
])

/** Mirrors how antd applies a column comparator, including its descend negation. */
function applySort<T>(rows: T[], cmp: (a: T, b: T, o?: 'ascend' | 'descend') => number, order: 'ascend' | 'descend') {
  return [...rows].sort((a, b) => {
    const r = cmp(a, b, order)
    return order === 'ascend' ? r : -r
  })
}

const keys = (list: DatasetEntry[]) => list.map((e) => e.key)

describe('compareByName', () => {
  it('compares case-insensitively', () => {
    expect(keys(applySort([BIG, MID], compareByName, 'ascend'))).toEqual(['mid', 'big'])
    expect(keys(applySort([MID, BIG], compareByName, 'descend'))).toEqual(['big', 'mid'])
  })
})

describe('compareByCollection', () => {
  it('orders collections alphabetically', () => {
    expect(keys(applySort([BIG, MID], compareByCollection, 'ascend'))).toEqual(['mid', 'big'])
  })

  it('keeps datasets with no collection at the bottom in both directions', () => {
    for (const order of ['ascend', 'descend'] as const) {
      const sorted = applySort([UNKNOWN, BIG, MID], compareByCollection, order)
      expect(sorted[sorted.length - 1].key).toBe('unknown')
    }
  })
})

describe('makeShapeComparator', () => {
  const byCells = makeShapeComparator(probes, 'nObs')
  const byGenes = makeShapeComparator(probes, 'nVar')

  it('sorts by cells in both directions', () => {
    expect(keys(applySort([MID, BIG], byCells, 'descend'))).toEqual(['big', 'mid'])
    expect(keys(applySort([BIG, MID], byCells, 'ascend'))).toEqual(['mid', 'big'])
  })

  it('keeps unprobed datasets at the bottom in both directions', () => {
    for (const order of ['ascend', 'descend'] as const) {
      const sorted = applySort([UNKNOWN, BIG, MID], byCells, order)
      expect(sorted[sorted.length - 1].key).toBe('unknown')
    }
  })

  it('sorts genes independently of cells', () => {
    // MID has fewer cells than BIG but more genes.
    expect(keys(applySort([BIG, MID], byGenes, 'descend'))).toEqual(['mid', 'big'])
  })

  it('treats two unknowns as equal', () => {
    const other = entry({ key: 'other', name: 'Other' })
    expect(byCells(UNKNOWN, other, 'ascend')).toBe(0)
  })
})

describe('makeShapeComparator with catalog-supplied counts', () => {
  // The point of harvesting counts server-side: the column sorts on first paint
  // instead of waiting for every store to answer a probe.
  const CATALOG_BIG = entry({ key: 'cbig', name: 'Big', counts: { nObs: 900_000, nVar: 30_000 } })
  const CATALOG_SMALL = entry({ key: 'csmall', name: 'Small', counts: { nObs: 2_700, nVar: 33_000 } })
  const noProbes = new Map<string, ProbeResult>()

  it('sorts by cells with no probe results at all', () => {
    const sorted = applySort([CATALOG_SMALL, CATALOG_BIG], makeShapeComparator(noProbes, 'nObs'), 'descend')
    expect(sorted.map((e) => e.key)).toEqual(['cbig', 'csmall'])
  })

  it('sorts by genes with no probe results at all', () => {
    const sorted = applySort([CATALOG_BIG, CATALOG_SMALL], makeShapeComparator(noProbes, 'nVar'), 'descend')
    expect(sorted.map((e) => e.key)).toEqual(['csmall', 'cbig'])
  })

  it('ranks a catalog dataset against a pasted URL that only the probe measured', () => {
    // Mixed sources must be comparable — the list interleaves both kinds.
    const pasted = entry({ key: 'pasted', name: 'Pasted', kind: 'local' })
    const mixed = new Map<string, ProbeResult>([['pasted', { status: 'ok', shape: { nObs: 500_000 } }]])
    const sorted = applySort(
      [CATALOG_SMALL, pasted, CATALOG_BIG],
      makeShapeComparator(mixed, 'nObs'),
      'descend',
    )
    expect(sorted.map((e) => e.key)).toEqual(['cbig', 'pasted', 'csmall'])
  })

  it('still pins a dataset with neither source to the bottom in both directions', () => {
    const cmp = makeShapeComparator(noProbes, 'nObs')
    const unknown = entry({ key: 'none', name: 'None' })
    expect(applySort([unknown, CATALOG_BIG], cmp, 'descend').map((e) => e.key)).toEqual(['cbig', 'none'])
    expect(applySort([unknown, CATALOG_BIG], cmp, 'ascend').map((e) => e.key)).toEqual(['cbig', 'none'])
  })
})
