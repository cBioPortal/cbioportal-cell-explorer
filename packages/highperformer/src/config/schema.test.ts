import { describe, it, expect } from 'vitest'
import { AppConfigSchema, MessageSchema, type AppConfig } from './schema'

describe('AppConfigSchema', () => {
  it('validates a minimal config with only url', () => {
    const result = AppConfigSchema.safeParse({ url: 'https://example.com/data.zarr' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.url).toBe('https://example.com/data.zarr')
    }
  })

  it('rejects config without url', () => {
    const result = AppConfigSchema.safeParse({ embedding: 'X_umap' })
    expect(result.success).toBe(false)
  })

  it('validates a full config', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      embedding: 'X_umap',
      colorBy: 'gene',
      gene: 'TP53',
      geneLabelColumn: 'gene_symbol',
      filter: { ids: ['cell1', 'cell2'], obsColumn: 'sample_id' },
      summaryObsColumns: ['cell_type', 'batch'],
      summaryGenes: ['TP53', 'BRCA1'],
      showHeader: false,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: false,
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      unknownField: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).unknownField).toBeUndefined()
    }
  })

  it('defaults UI toggles to true when not specified', () => {
    const result = AppConfigSchema.safeParse({ url: 'https://example.com/data.zarr' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.showHeader).toBe(true)
      expect(result.data.showLeftSidebar).toBe(true)
      expect(result.data.showRightSidebar).toBe(true)
      expect(result.data.showDatasetDropdown).toBe(true)
    }
  })

  it('validates colorBy gene requires gene field', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      colorBy: 'gene',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.colorBy).toBeUndefined()
    }
  })

  it('validates colorBy category requires category field', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      colorBy: 'category',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.colorBy).toBeUndefined()
    }
  })

  it('keeps colorBy gene when gene is provided', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      colorBy: 'gene',
      gene: 'TP53',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.colorBy).toBe('gene')
      expect(result.data.gene).toBe('TP53')
    }
  })

  it('validates filter requires both ids and obsColumn', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      filter: { ids: ['cell1'] },
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty ids array in filter', () => {
    const result = AppConfigSchema.safeParse({
      url: 'https://example.com/data.zarr',
      filter: { ids: [], obsColumn: 'sample_id' },
    })
    expect(result.success).toBe(true)
  })
})

describe('MessageSchema', () => {
  it('validates a valid applyConfig message', () => {
    const result = MessageSchema.safeParse({
      type: 'applyConfig',
      payload: { url: 'https://example.com/data.zarr' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects message with missing type', () => {
    const result = MessageSchema.safeParse({
      payload: { url: 'https://example.com/data.zarr' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects message with unknown type', () => {
    const result = MessageSchema.safeParse({
      type: 'unknownType',
      payload: { url: 'https://example.com/data.zarr' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects message with invalid payload', () => {
    const result = MessageSchema.safeParse({
      type: 'applyConfig',
      payload: { embedding: 'X_umap' }, // missing url
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-object messages', () => {
    expect(MessageSchema.safeParse('hello').success).toBe(false)
    expect(MessageSchema.safeParse(42).success).toBe(false)
    expect(MessageSchema.safeParse(null).success).toBe(false)
  })

  it('validates payload with full config', () => {
    const result = MessageSchema.safeParse({
      type: 'applyConfig',
      payload: {
        url: 'https://example.com/data.zarr',
        embedding: 'X_umap',
        filter: { ids: ['cell1'], obsColumn: 'sample_id' },
        showHeader: false,
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payload.url).toBe('https://example.com/data.zarr')
      expect(result.data.payload.showHeader).toBe(false)
    }
  })
})
