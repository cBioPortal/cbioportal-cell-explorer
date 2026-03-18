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
      showSidebar: false,
      showDatasetDropdown: false,
    }

    applyConfig(config)

    const state = useAppStore.getState()
    expect(state.showHeader).toBe(false)
    expect(state.showSidebar).toBe(false)
    expect(state.showDatasetDropdown).toBe(false)
  })

  it('calls openDataset with config url', () => {
    const openDataset = vi.spyOn(useAppStore.getState(), 'openDataset').mockResolvedValue()

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      showHeader: true,
      showSidebar: true,
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
      showSidebar: true,
      showDatasetDropdown: true,
    }

    applyConfig(config)

    const state = useAppStore.getState()
    expect(state.showHeader).toBe(true)
    expect(state.showSidebar).toBe(true)
    expect(state.showDatasetDropdown).toBe(true)
  })

  it('applies embedding when metadata is ready', async () => {
    const setSelectedEmbedding = vi.spyOn(useAppStore.getState(), 'setSelectedEmbedding').mockImplementation(() => {})

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      embedding: 'X_umap',
      showHeader: true,
      showSidebar: true,
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

  it('warns and skips invalid embedding', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      embedding: 'X_nonexistent',
      showHeader: true,
      showSidebar: true,
      showDatasetDropdown: true,
    }

    const promise = applyConfig(config)
    useAppStore.setState({ obsColumnNames: ['cell_type'], obsmKeys: ['X_umap'], varNames: [], varColumns: [] })
    await promise

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('X_nonexistent'))
    warn.mockRestore()
  })

  it('calls selectByIds for filter config', async () => {
    const selectByIds = vi.spyOn(useAppStore.getState(), 'selectByIds').mockImplementation(() => {})

    const config: AppConfig = {
      url: 'https://example.com/data.zarr',
      filter: { ids: ['cell1', 'cell2'], obsColumn: 'sample_id' },
      showHeader: true,
      showSidebar: true,
      showDatasetDropdown: true,
    }

    const promise = applyConfig(config)
    useAppStore.setState({ obsColumnNames: ['sample_id'], obsmKeys: [], varNames: [], varColumns: [] })
    await promise

    expect(selectByIds).toHaveBeenCalledWith('sample_id', ['cell1', 'cell2'])
    selectByIds.mockRestore()
  })
})
