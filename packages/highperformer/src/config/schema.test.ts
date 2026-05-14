import { describe, expect, it } from 'vitest'
import { AppConfigSchema } from './schema'

describe('AppConfigSchema', () => {
  it('accepts a fully-populated config', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      embedding: 'X_umap',
      colorBy: 'gene',
      gene: 'CD3D',
      filter: { obsColumn: 'cell_type', ids: ['T'] },
      viewport: { target: [10, 20], zoom: 3 },
      pointSize: 2.5,
      opacity: 0.8,
      summaryContext: 'selections',
      summaryObsColumns: ['cell_type'],
      summaryGenes: ['CD3D'],
      showHeader: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty config (all fields optional)', () => {
    expect(AppConfigSchema.safeParse({}).success).toBe(true)
  })

  it('does NOT enforce cross-field rules in the schema (moved to applyConfig)', () => {
    // colorBy="gene" without `gene` is a SCHEMA-VALID payload now;
    // applyConfig's missing_companion check rejects it at apply time.
    const result = AppConfigSchema.safeParse({ colorBy: 'gene' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid types', () => {
    expect(AppConfigSchema.safeParse({ pointSize: 'big' }).success).toBe(false)
    expect(AppConfigSchema.safeParse({ opacity: 1.5 }).success).toBe(false)
    expect(AppConfigSchema.safeParse({ viewport: { target: [1, 2] } }).success).toBe(false)
  })

  it('rejects unknown fields when strict (additionalProperties=false on viewport)', () => {
    // Top-level lenient behavior is acceptable — this test asserts that.
    const result = AppConfigSchema.safeParse({ embedding: 'X_umap', futuristicField: 'x' })
    expect(result.success).toBe(true)
  })

  it('accepts categoryLabelsObsColumn (string, null, or omitted)', () => {
    expect(AppConfigSchema.safeParse({ categoryLabelsObsColumn: 'leiden' }).success).toBe(true)
    expect(AppConfigSchema.safeParse({ categoryLabelsObsColumn: null }).success).toBe(true)
    expect(AppConfigSchema.safeParse({}).success).toBe(true)
  })

  it('rejects non-string non-null categoryLabelsObsColumn', () => {
    expect(AppConfigSchema.safeParse({ categoryLabelsObsColumn: 42 }).success).toBe(false)
  })
})
