import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock WorkerPool using the same pattern as useAppStore.test.ts
const mockDispatch = vi.fn()
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class MockPool {
    dispatch = mockDispatch
    clearQueue = vi.fn()
    dispose() {}
  },
}))

vi.mock('../workers/universal.worker.ts?worker', () => ({
  default: class MockWorker {},
}))

const { default: useAppStore } = await import('../store/useAppStore')
const { applyConfig } = await import('./applyConfig')
import type { AppConfig } from './schema'

describe('applyConfig', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    mockDispatch.mockClear()
    mockDispatch.mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(8), version: 1 })
  })

  it('sets UI toggles immediately', () => {
    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      showHeader: false,
      showLeftSidebar: true,
      showRightSidebar: false,
      showDatasetDropdown: false,
    }

    applyConfig(config)

    const state = useAppStore.getState()
    expect(state.showHeader).toBe(false)
    expect(state.showLeftSidebar).toBe(true)
    expect(state.showRightSidebar).toBe(false)
    expect(state.showDatasetDropdown).toBe(false)
  })

  it('calls openDataset with config url', () => {
    const openDataset = vi.spyOn(useAppStore.getState(), 'openDataset').mockResolvedValue()

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }

    applyConfig(config)

    expect(openDataset).toHaveBeenCalledWith('https://example.com/data.zarr')
    openDataset.mockRestore()
  })

  it('preserves default UI toggles when not specified in config', () => {
    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }

    applyConfig(config)

    const state = useAppStore.getState()
    expect(state.showHeader).toBe(true)
    expect(state.showLeftSidebar).toBe(true)
    expect(state.showRightSidebar).toBe(true)
    expect(state.showDatasetDropdown).toBe(true)
  })

  it('applies embedding when metadata is ready', async () => {
    const setSelectedEmbedding = vi.spyOn(useAppStore.getState(), 'setSelectedEmbedding').mockImplementation(() => {})

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      embedding: 'X_umap',
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }

    const promise = applyConfig(config)

    // Simulate dataset becoming ready
    useAppStore.setState({
      obsColumnNames: ['cell_type', 'batch'],
      obsmKeys: ['X_umap', 'X_tsne'],
      varNames: ['TP53', 'BRCA1'],
      varColumns: ['gene_symbol'],
    })

    await promise

    expect(setSelectedEmbedding).toHaveBeenCalledWith('X_umap')
    setSelectedEmbedding.mockRestore()
  })

  it('returns field_value_invalid for invalid embedding', async () => {
    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      embedding: 'X_nonexistent',
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }

    const promise = applyConfig(config)
    useAppStore.setState({ obsColumnNames: ['cell_type'], obsmKeys: ['X_umap'], varNames: [], varColumns: [] })
    const result = await promise

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('embedding')
      expect(result.reason.value).toBe('X_nonexistent')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('calls selectByIds for filter config', async () => {
    const selectByIds = vi.spyOn(useAppStore.getState(), 'selectByIds').mockImplementation(() => {})

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      filter: { ids: ['cell1', 'cell2'], obsColumn: 'sample_id' },
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }

    const promise = applyConfig(config)
    useAppStore.setState({ obsColumnNames: ['sample_id'], obsmKeys: [], varNames: [], varColumns: [] })
    await promise

    expect(selectByIds).toHaveBeenCalledWith('sample_id', ['cell1', 'cell2'])
    selectByIds.mockRestore()
  })
})

describe('applyConfig — return type and schema validation', () => {
  it('returns { ok: true } on a valid empty payload', async () => {
    const result = await applyConfig({})
    expect(result.ok).toBe(true)
  })

  it('returns { ok: false, kind: "schema_validation" } on garbage payload', async () => {
    const result = await applyConfig({ pointSize: 'huge' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason.kind).toBe('schema_validation')
  })

  it('returns { ok: false, kind: "schema_validation" } when neither url nor dataset is implied (null payload)', async () => {
    const result = await applyConfig(null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason.kind).toBe('schema_validation')
  })
})

describe('applyConfig — cross-field validation', () => {
  it('returns missing_companion when colorBy=gene without gene', async () => {
    const result = await applyConfig({ colorBy: 'gene' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'missing_companion') {
      expect(result.reason.field).toBe('gene')
    } else {
      throw new Error('expected missing_companion error')
    }
  })

  it('returns missing_companion when colorBy=category without category', async () => {
    const result = await applyConfig({ colorBy: 'category' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'missing_companion') {
      expect(result.reason.field).toBe('category')
    } else {
      throw new Error('expected missing_companion error')
    }
  })
})

describe('applyConfig — apply-time field validation', () => {
  beforeEach(() => {
    useAppStore.setState({
      varNames: ['CD3D', 'CD8A', 'GZMK'],
      varColumns: ['feature_id', 'gene_symbol'],
      obsmKeys: ['X_umap', 'X_pca'],
      obsColumnNames: ['cell_type', 'percent_mt'],
    } as any)
  })

  it('returns field_value_invalid for unknown gene', async () => {
    const result = await applyConfig({ colorBy: 'gene', gene: 'NONEXISTENT' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('gene')
      expect(result.reason.value).toBe('NONEXISTENT')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('returns field_value_invalid for unknown embedding', async () => {
    const result = await applyConfig({ embedding: 'X_imaginary' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('embedding')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('returns field_value_invalid for unknown filter.obsColumn', async () => {
    const result = await applyConfig({
      filter: { obsColumn: 'no_such_col', ids: ['x'] },
    })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('filter.obsColumn')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('returns field_value_invalid for unknown geneLabelColumn', async () => {
    const result = await applyConfig({ geneLabelColumn: 'not_a_var_col' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('geneLabelColumn')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })
})
