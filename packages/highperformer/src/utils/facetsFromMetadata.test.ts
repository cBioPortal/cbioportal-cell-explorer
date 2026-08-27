import { describe, it, expect } from 'vitest'
import {
  facetValuesFor,
  facetDefsFrom,
  labelForFacet,
  MAX_FACET_VALUES,
  type ObsColumn,
} from './facetsFromMetadata'

const col = (o: Partial<ObsColumn> & { name: string }): ObsColumn => ({
  dtype: 'categorical',
  ...o,
})

describe('facetValuesFor', () => {
  it('keys values by the backend facet, not the column name', () => {
    const out = facetValuesFor([col({ name: 'tissue', facet: 'tissue', values: ['lung'] })])
    expect(out).toEqual({ tissue: ['lung'] })
  })

  it('ignores columns the backend did not mark as a facet', () => {
    expect(facetValuesFor([col({ name: 'Phase', values: ['G1', 'S'] })])).toEqual({})
  })

  it('ignores numeric columns even when marked', () => {
    const out = facetValuesFor([
      col({ name: 'percent.mt', dtype: 'numeric', facet: 'percent', values: ['1'] }),
    ])
    expect(out).toEqual({})
  })

  it('ignores columns whose values were capped away', () => {
    const out = facetValuesFor([
      col({ name: 'observation_joinid', facet: 'obs', cardinality: 927205, values: null }),
    ])
    expect(out).toEqual({})
  })

  it('prefers the column named like the facet over an author variant', () => {
    // Real shape: both claim cell_type, with incompatible vocabularies.
    const out = facetValuesFor([
      col({ name: 'author_cell_type', facet: 'cell_type', values: ['AE1', 'AT1'] }),
      col({ name: 'cell_type', facet: 'cell_type', values: ['B cell', 'fibroblast'] }),
    ])
    expect(out.cell_type).toEqual(['B cell', 'fibroblast'])
  })

  it('falls back to the author variant when no canonical column exists', () => {
    const out = facetValuesFor([
      col({ name: 'author_cell_type', facet: 'cell_type', values: ['AE1', 'AT1'] }),
    ])
    expect(out.cell_type).toEqual(['AE1', 'AT1'])
  })

  it('unions several non-canonical columns rather than dropping one', () => {
    const out = facetValuesFor([
      col({ name: 'condition', facet: 'disease', values: ['fresh'] }),
      col({ name: 'author_disease', facet: 'disease', values: ['TST', 'fresh'] }),
    ])
    expect(out.disease.sort()).toEqual(['TST', 'fresh'])
  })
})

describe('facetDefsFrom', () => {
  it('drops facets whose catalogue-wide vocabulary is too large to browse', () => {
    const huge = Array.from({ length: MAX_FACET_VALUES + 1 }, (_, i) => `donor-${i}`)
    const defs = facetDefsFrom([{ donor: huge, tissue: ['lung'] }])
    expect(defs.map((d) => d.key)).toEqual(['tissue'])
  })

  it('applies the ceiling across datasets, not per dataset', () => {
    // Each dataset contributes few values; together they exceed the ceiling.
    const spread = Array.from({ length: MAX_FACET_VALUES + 1 }, (_, i) => ({
      donor: [`donor-${i}`],
    }))
    expect(facetDefsFrom(spread).map((d) => d.key)).not.toContain('donor')
  })

  it('drops facets that are a graded axis rather than a set of choices', () => {
    // 90 values of "1-month-old stage" / "10-year-old stage": small enough to
    // pass the ceiling, but a range, not a checklist.
    const defs = facetDefsFrom([{ development_stage: ['1-month-old stage'], tissue: ['lung'] }])
    expect(defs.map((d) => d.key)).toEqual(['tissue'])
  })

  it('orders known facets deliberately and unknown ones after', () => {
    const defs = facetDefsFrom([{ sex: ['female'], tissue: ['lung'], custom: ['x'] }])
    expect(defs.map((d) => d.key)).toEqual(['tissue', 'sex', 'custom'])
  })

  it('derives a readable label, since no manifest endpoint supplies one', () => {
    expect(labelForFacet('cell_type')).toBe('Cell type')
    expect(labelForFacet('tissue')).toBe('Tissue')
  })
})
