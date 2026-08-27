import { describe, it, expect } from 'vitest'
import {
  NOT_ANNOTATED,
  isAnnotated,
  partitionByAnnotation,
  hasFacetValue,
  matchesFilters,
  applyFacetFilters,
  countFacetValues,
  sortFacetValues,
  facetCoverage,
  isDiscriminating,
  countActiveFilters,
  toggleFacetValue,
} from './facets'
import type { DatasetEntry } from './datasetEntries'

const entry = (
  key: string,
  facets: DatasetEntry['facets'],
): DatasetEntry => ({
  key,
  kind: 'catalog',
  name: key,
  description: null,
  url: `https://x/${key}.zarr`,
  isPublic: true,
  slug: key,
  facets,
})

// Two tissues each, overlapping on "lymph node"; only spectrum has cell types.
const SPECTRUM = entry('spectrum', {
  tissue: ['lymph node', 'caecum'],
  cell_type: ['T cell', 'fibroblast'],
})
const GLIOMA = entry('glioma', { tissue: ['brain', 'lymph node'] })
const BREAST = entry('breast', { tissue: ['breast'] })
const UNANNOTATED = entry('pilot', {})
const NOT_INGESTED = entry('pending', null)

const ALL = [SPECTRUM, GLIOMA, BREAST, UNANNOTATED, NOT_INGESTED]
const keys = (list: DatasetEntry[]) => list.map((e) => e.key)

describe('isAnnotated / partitionByAnnotation', () => {
  it('treats an empty object and null alike for browsing', () => {
    expect(isAnnotated(UNANNOTATED)).toBe(false)
    expect(isAnnotated(NOT_INGESTED)).toBe(false)
  })

  it('treats a key present but empty as unannotated', () => {
    expect(isAnnotated(entry('hollow', { tissue: [] }))).toBe(false)
  })

  it('splits the catalogue in two without losing anyone', () => {
    const { annotated, unannotated } = partitionByAnnotation(ALL)
    expect(keys(annotated)).toEqual(['spectrum', 'glioma', 'breast'])
    expect(keys(unannotated)).toEqual(['pilot', 'pending'])
    expect(annotated.length + unannotated.length).toBe(ALL.length)
  })
})

describe('hasFacetValue', () => {
  it('matches a declared value', () => {
    expect(hasFacetValue(SPECTRUM, 'tissue', 'lymph node')).toBe(true)
    expect(hasFacetValue(SPECTRUM, 'tissue', 'brain')).toBe(false)
  })

  it('NOT_ANNOTATED matches exactly those with no value for that key', () => {
    // Glioma is annotated overall, but declares no cell_type.
    expect(hasFacetValue(GLIOMA, 'cell_type', NOT_ANNOTATED)).toBe(true)
    expect(hasFacetValue(SPECTRUM, 'cell_type', NOT_ANNOTATED)).toBe(false)
  })
})

describe('matchesFilters', () => {
  it('ORs within a facet', () => {
    const f = { tissue: ['brain', 'breast'] }
    expect(keys(applyFacetFilters(ALL, f))).toEqual(['glioma', 'breast'])
  })

  it('ANDs across facets', () => {
    const both = { tissue: ['lymph node'], cell_type: ['T cell'] }
    expect(keys(applyFacetFilters(ALL, both))).toEqual(['spectrum'])
  })

  it('ignores a facet with nothing selected', () => {
    expect(applyFacetFilters(ALL, { tissue: [] })).toHaveLength(ALL.length)
  })

  it('excludes unannotated datasets from any active filter', () => {
    const out = applyFacetFilters(ALL, { tissue: ['lymph node'] })
    expect(keys(out)).not.toContain('pilot')
    expect(keys(out)).not.toContain('pending')
  })

  it('exceptKey drops that facet from the test', () => {
    const f = { tissue: ['brain'], cell_type: ['T cell'] }
    expect(matchesFilters(SPECTRUM, f)).toBe(false)
    expect(matchesFilters(SPECTRUM, f, 'tissue')).toBe(true)
  })
})

describe('countFacetValues', () => {
  it('counts a dataset once per value it carries', () => {
    const c = countFacetValues(ALL, 'tissue', {})
    expect(c.get('lymph node')).toBe(2)
    expect(c.get('caecum')).toBe(1)
    expect(c.get('brain')).toBe(1)
  })

  it('counts datasets lacking the field under NOT_ANNOTATED', () => {
    // pilot and pending have no tissue at all.
    expect(countFacetValues(ALL, 'tissue', {}).get(NOT_ANNOTATED)).toBe(2)
    // glioma and breast are annotated but declare no cell_type.
    expect(countFacetValues(ALL, 'cell_type', {}).get(NOT_ANNOTATED)).toBe(4)
  })

  it('respects other facets but not its own selection', () => {
    const f = { tissue: ['lymph node'] }
    const c = countFacetValues(ALL, 'tissue', f)
    // Selecting lymph node must not zero out its siblings — that is the whole
    // point of exceptKey, and without it the facet becomes a dead end.
    expect(c.get('brain')).toBe(1)
    expect(c.get('breast')).toBe(1)

    // cell_type, by contrast, is narrowed by the tissue selection.
    const cc = countFacetValues(ALL, 'cell_type', f)
    expect(cc.get('T cell')).toBe(1)
  })
})

describe('sortFacetValues', () => {
  it('orders by count, then alphabetically, with absence last', () => {
    const counts = new Map([
      ['zebra', 1],
      ['apple', 1],
      [NOT_ANNOTATED, 99],
      ['common', 5],
    ])
    expect(sortFacetValues(counts).map((v) => v.value)).toEqual([
      'common',
      'apple',
      'zebra',
      NOT_ANNOTATED,
    ])
  })

  it('keeps zero-count values rather than dropping them', () => {
    const sorted = sortFacetValues(new Map([['gone', 0], ['here', 2]]))
    expect(sorted.map((v) => v.value)).toEqual(['here', 'gone'])
  })
})

describe('facetCoverage', () => {
  it('counts only entries declaring a value', () => {
    expect(facetCoverage(ALL, 'tissue')).toBe(3)
    expect(facetCoverage(ALL, 'cell_type')).toBe(1)
    expect(facetCoverage(ALL, 'nonexistent')).toBe(0)
  })
})

describe('isDiscriminating', () => {
  it('rejects a facet where every dataset would answer the same', () => {
    expect(isDiscriminating(new Map([['Homo sapiens', 57]]))).toBe(false)
  })

  it('does not count absence as a distinguishing value', () => {
    expect(isDiscriminating(new Map([['only', 3], [NOT_ANNOTATED, 40]]))).toBe(false)
  })

  it('accepts two or more real values', () => {
    expect(isDiscriminating(new Map([['a', 1], ['b', 1]]))).toBe(true)
  })
})

describe('toggleFacetValue', () => {
  it('adds, then removes, then drops the key entirely', () => {
    const one = toggleFacetValue({}, 'tissue', 'brain')
    expect(one).toEqual({ tissue: ['brain'] })

    const two = toggleFacetValue(one, 'tissue', 'lymph node')
    expect(two.tissue).toEqual(['brain', 'lymph node'])

    const back = toggleFacetValue(two, 'tissue', 'brain')
    expect(back.tissue).toEqual(['lymph node'])

    // Emptying a facet removes the key, so "no filter" has exactly one shape.
    expect(toggleFacetValue(back, 'tissue', 'lymph node')).toEqual({})
  })

  it('does not mutate the filters it is given', () => {
    const before = { tissue: ['brain'] }
    toggleFacetValue(before, 'tissue', 'lymph node')
    expect(before).toEqual({ tissue: ['brain'] })
  })
})

describe('countActiveFilters', () => {
  it('sums selections across facets', () => {
    expect(countActiveFilters({})).toBe(0)
    expect(countActiveFilters({ tissue: ['a', 'b'], cell_type: ['c'] })).toBe(3)
  })
})

describe('NOT_ANNOTATED sentinel', () => {
  it('is plain ASCII, so the source stays text and URLs stay valid', () => {
    // A NUL-prefixed sentinel made git treat this file as binary and put %00
    // into shareable filter URLs.
    expect(NOT_ANNOTATED).toMatch(/^[\x20-\x7e]+$/)
    expect(encodeURIComponent(NOT_ANNOTATED)).not.toContain('%00')
  })

  it('cannot collide with a real facet value', () => {
    expect(hasFacetValue(SPECTRUM, 'tissue', NOT_ANNOTATED)).toBe(false)
  })
})
