import { describe, it, expect, vi, beforeEach } from 'vitest'

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
const { buildConfigFromState, buildConfigUrl, buildDatasetUrl } = await import('./buildConfig')
const { parseConfig } = await import('./parseConfig')

describe('buildConfigFromState', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })

  it('returns null when datasetUrl is null', () => {
    expect(buildConfigFromState()).toBeNull()
  })

  it('returns config with url when dataset is loaded', () => {
    useAppStore.setState({ datasetUrl: 'https://example.com/data.zarr' })
    const config = buildConfigFromState()
    expect(config).not.toBeNull()
    expect(config!.url).toBe('https://example.com/data.zarr')
  })

  it('includes embedding', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      selectedEmbedding: 'X_umap',
    })
    const config = buildConfigFromState()
    expect(config!.embedding).toBe('X_umap')
  })

  it('includes gene color mapping and excludes category', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      colorMode: 'gene',
      selectedGene: 'TP53',
      selectedObsColumn: 'cell_type',
    })
    const config = buildConfigFromState()
    expect(config!.colorBy).toBe('gene')
    expect(config!.gene).toBe('TP53')
    expect(config!.category).toBeUndefined()
  })

  it('excludes colorBy when gene mode but no gene selected', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      colorMode: 'gene',
      selectedGene: null,
    })
    const config = buildConfigFromState()
    expect(config!.colorBy).toBeUndefined()
    expect(config!.gene).toBeUndefined()
  })

  it('includes category color mapping', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      colorMode: 'category',
      selectedObsColumn: 'cell_type',
    })
    const config = buildConfigFromState()
    expect(config!.colorBy).toBe('category')
    expect(config!.category).toBe('cell_type')
    expect(config!.gene).toBeUndefined()
  })

  it('includes filter when customGroupIds has entries', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      customGroupIds: ['cell1', 'cell2'],
      customGroupColumn: 'sample_id',
    })
    const config = buildConfigFromState()
    expect(config!.filter).toEqual({ ids: ['cell1', 'cell2'], obsColumn: 'sample_id' })
  })

  it('excludes filter when customGroupIds is empty', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      customGroupColumn: 'sample_id',
      customGroupIds: [],
    })
    const config = buildConfigFromState()
    expect(config!.filter).toBeUndefined()
  })

  it('includes summary panel state', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      summaryObsColumns: ['cell_type', 'batch'],
      summaryGenes: ['TP53'],
    })
    const config = buildConfigFromState()
    expect(config!.summaryObsColumns).toEqual(['cell_type', 'batch'])
    expect(config!.summaryGenes).toEqual(['TP53'])
  })

  it('includes UI toggles', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      showHeader: false,
      showLeftSidebar: false,
      showRightSidebar: true,
      showDatasetDropdown: false,
    })
    const config = buildConfigFromState()
    expect(config!.showHeader).toBe(false)
    expect(config!.showLeftSidebar).toBe(false)
    expect(config!.showRightSidebar).toBe(true)
    expect(config!.showDatasetDropdown).toBe(false)
  })

  it('includes geneLabelColumn', () => {
    useAppStore.setState({
      datasetUrl: 'https://example.com/data.zarr',
      geneLabelColumn: 'gene_symbol',
    })
    const config = buildConfigFromState()
    expect(config!.geneLabelColumn).toBe('gene_symbol')
  })
})

describe('buildConfigUrl', () => {
  it('encodes config as URL', () => {
    const config = {
      url: 'https://example.com/data.zarr',
      showHeader: true,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }
    const url = buildConfigUrl(config)
    expect(url).toContain('?config=')
    expect(url).toContain('view')
  })

  it('round-trips through parseConfig', () => {
    const config = {
      url: 'https://example.com/data.zarr',
      embedding: 'X_umap',
      colorBy: 'gene' as const,
      gene: 'TP53',
      showHeader: false,
      showLeftSidebar: true,
      showRightSidebar: true,
      showDatasetDropdown: true,
    }
    const url = buildConfigUrl(config)
    const configParam = new URL(url).searchParams.get('config')
    const parsed = parseConfig(configParam)
    expect(parsed).not.toBeNull()
    expect(parsed!.url).toBe('https://example.com/data.zarr')
    expect(parsed!.embedding).toBe('X_umap')
    expect(parsed!.colorBy).toBe('gene')
    expect(parsed!.gene).toBe('TP53')
    expect(parsed!.showHeader).toBe(false)
  })
})

describe('buildDatasetUrl', () => {
  it('builds simple dataset URL', () => {
    const url = buildDatasetUrl('https://example.com/data.zarr')
    expect(url).toContain('view?url=https://example.com/data.zarr')
  })
})
