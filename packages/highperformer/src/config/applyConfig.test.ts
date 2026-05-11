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

  it('returns field_value_invalid when highlightedCategories is provided without colorBy=category', async () => {
    const result = await applyConfig({ highlightedCategories: ['T cell'] })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('highlightedCategories')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })
})

describe('applyConfig — highlightedCategories', () => {
  beforeEach(() => {
    useAppStore.setState({
      varNames: ['CD8A'],
      obsmKeys: ['X_umap'],
      obsColumnNames: ['cell_type'],
      loading: false,
    } as any)
  })

  it('translates labels → codes and writes to store when category load completes', async () => {
    // Stub selectObsColumn to populate categoryMap synchronously so waitForStore
    // resolves without needing a real worker dispatch.
    const selectObsColumn = vi
      .spyOn(useAppStore.getState(), 'selectObsColumn')
      .mockImplementation((name: string) => {
        useAppStore.setState({
          selectedObsColumn: name,
          categoryMap: [
            { label: 'T cell', color: [255, 0, 0] },
            { label: 'B cell', color: [0, 255, 0] },
            { label: 'Monocyte', color: [0, 0, 255] },
          ],
        } as any)
      })
    const rebuildColorBuffer = vi
      .spyOn(useAppStore.getState(), 'rebuildColorBuffer')
      .mockImplementation(() => {})

    const result = await applyConfig({
      colorBy: 'category',
      category: 'cell_type',
      highlightedCategories: ['T cell', 'Monocyte'],
    })

    expect(result.ok).toBe(true)
    const codes = useAppStore.getState().highlightedCategories
    expect(codes.size).toBe(2)
    expect(codes.has(0)).toBe(true) // T cell
    expect(codes.has(2)).toBe(true) // Monocyte
    expect(rebuildColorBuffer).toHaveBeenCalled()

    selectObsColumn.mockRestore()
    rebuildColorBuffer.mockRestore()
  })

  it('returns field_value_invalid when a label does not exist in categoryMap', async () => {
    const selectObsColumn = vi
      .spyOn(useAppStore.getState(), 'selectObsColumn')
      .mockImplementation((name: string) => {
        useAppStore.setState({
          selectedObsColumn: name,
          categoryMap: [{ label: 'T cell', color: [255, 0, 0] }],
        } as any)
      })

    const result = await applyConfig({
      colorBy: 'category',
      category: 'cell_type',
      highlightedCategories: ['Imaginary cell'],
    })

    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('highlightedCategories')
      expect(result.reason.value).toBe('Imaginary cell')
    } else {
      throw new Error('expected field_value_invalid error')
    }

    selectObsColumn.mockRestore()
  })

  it('empty highlightedCategories array clears highlights (no-op set)', async () => {
    const selectObsColumn = vi
      .spyOn(useAppStore.getState(), 'selectObsColumn')
      .mockImplementation((name: string) => {
        useAppStore.setState({
          selectedObsColumn: name,
          categoryMap: [{ label: 'T cell', color: [255, 0, 0] }],
        } as any)
      })

    useAppStore.setState({ highlightedCategories: new Set([0]) } as any)

    const result = await applyConfig({
      colorBy: 'category',
      category: 'cell_type',
      highlightedCategories: [],
    })

    expect(result.ok).toBe(true)
    expect(useAppStore.getState().highlightedCategories.size).toBe(0)

    selectObsColumn.mockRestore()
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

  it('accepts a gene symbol (resolved via geneLabelMap) and calls selectGene with the var index', async () => {
    // Spectrum-style: varNames are Ensembl IDs, geneLabelMap resolves them to HGNC symbols.
    useAppStore.setState({
      varNames: ['ENSG_DAPL1', 'ENSG_GAPDH'],
      geneLabelColumn: 'feature_name',
      geneLabelMap: new Map([
        ['ENSG_DAPL1', 'DAPL1'],
        ['ENSG_GAPDH', 'GAPDH'],
      ]),
    } as any)
    const selectGene = vi.spyOn(useAppStore.getState(), 'selectGene').mockImplementation(() => {})

    const result = await applyConfig({ colorBy: 'gene', gene: 'DAPL1' })

    expect(result.ok).toBe(true)
    expect(selectGene).toHaveBeenCalledWith('ENSG_DAPL1')
    selectGene.mockRestore()
  })

  it('still accepts a raw var index when the gene matches varNames directly', async () => {
    useAppStore.setState({
      varNames: ['ENSG_DAPL1'],
      geneLabelColumn: 'feature_name',
      geneLabelMap: new Map([['ENSG_DAPL1', 'DAPL1']]),
    } as any)
    const selectGene = vi.spyOn(useAppStore.getState(), 'selectGene').mockImplementation(() => {})

    const result = await applyConfig({ colorBy: 'gene', gene: 'ENSG_DAPL1' })

    expect(result.ok).toBe(true)
    expect(selectGene).toHaveBeenCalledWith('ENSG_DAPL1')
    selectGene.mockRestore()
  })

  it('returns field_value_invalid when a gene is in neither varNames nor geneLabelMap', async () => {
    useAppStore.setState({
      varNames: ['ENSG_DAPL1'],
      geneLabelColumn: 'feature_name',
      geneLabelMap: new Map([['ENSG_DAPL1', 'DAPL1']]),
    } as any)
    const result = await applyConfig({ colorBy: 'gene', gene: 'NOT_A_GENE' })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('gene')
      expect(result.reason.value).toBe('NOT_A_GENE')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('summaryGenes accepts symbols and resolves to var indices', async () => {
    useAppStore.setState({
      varNames: ['ENSG_DAPL1', 'ENSG_GAPDH'],
      geneLabelColumn: 'feature_name',
      geneLabelMap: new Map([
        ['ENSG_DAPL1', 'DAPL1'],
        ['ENSG_GAPDH', 'GAPDH'],
      ]),
    } as any)
    const addSummaryGene = vi
      .spyOn(useAppStore.getState(), 'addSummaryGene')
      .mockImplementation(() => {})

    const result = await applyConfig({ summaryGenes: ['DAPL1', 'GAPDH'] })

    expect(result.ok).toBe(true)
    expect(addSummaryGene).toHaveBeenCalledWith('ENSG_DAPL1')
    expect(addSummaryGene).toHaveBeenCalledWith('ENSG_GAPDH')
    addSummaryGene.mockRestore()
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

describe('applyConfig — metadata_unavailable + summaryContext defaults', () => {
  it('returns metadata_unavailable when post-load fields are requested before any dataset is loaded', async () => {
    // Reset store to "no dataset loaded" state
    useAppStore.setState({
      varNames: [],
      varColumns: [],
      obsmKeys: [],
      obsColumnNames: [],
      loading: false,
    } as any)

    // Test relies on the refactored applyConfig short-circuiting when there's
    // no dataset load in flight at all.
    const result = await applyConfig({ embedding: 'X_umap' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason.kind).toBe('metadata_unavailable')
  })

  it('defaults summaryContext to "selections" when filter is set and summaryContext is not provided', async () => {
    useAppStore.setState({
      varNames: [],
      obsmKeys: [],
      obsColumnNames: ['cell_type'],
      summaryContext: 'overall',
    } as any)
    await applyConfig({ filter: { obsColumn: 'cell_type', ids: ['T'] } })
    expect(useAppStore.getState().summaryContext).toBe('selections')
  })

  it('respects an explicit summaryContext that overrides the default', async () => {
    // Schema 'overall' maps to store 'all' (external vs. internal naming)
    useAppStore.setState({
      varNames: [],
      obsmKeys: [],
      obsColumnNames: ['cell_type'],
      summaryContext: 'all',
    })
    await applyConfig({
      filter: { obsColumn: 'cell_type', ids: ['T'] },
      summaryContext: 'overall',
    })
    expect(useAppStore.getState().summaryContext).toBe('all')
  })
})

describe('applyConfig — new schema fields apply to store', () => {
  beforeEach(() => {
    useAppStore.setState({
      varNames: [],
      obsmKeys: ['X_umap'],
      obsColumnNames: ['cell_type'],
      loading: false,
      pointRadius: 1,
      opacity: 1,
      summaryContext: 'overall',
    } as any)
  })

  it('applies pointSize (maps to pointRadius) and opacity', async () => {
    const result = await applyConfig({ pointSize: 3, opacity: 0.5 })
    expect(result.ok).toBe(true)
    expect(useAppStore.getState().pointRadius).toBe(3)
    expect(useAppStore.getState().opacity).toBe(0.5)
  })

  it('applies summaryContext explicitly', async () => {
    const result = await applyConfig({ summaryContext: 'selections' })
    expect(result.ok).toBe(true)
    expect(useAppStore.getState().summaryContext).toBe('selections')
  })

  it('applies viewport target + zoom (calls store action)', async () => {
    const setViewport = vi.fn()
    useAppStore.setState({ setViewport } as any)
    const result = await applyConfig({ viewport: { target: [10, 20], zoom: 2 } })
    expect(result.ok).toBe(true)
    expect(setViewport).toHaveBeenCalledWith({ target: [10, 20], zoom: 2 })
  })

  it('writes viewport to store via setViewport action (real, not mocked)', async () => {
    // Reset to initial state first to ensure the real setViewport action is in place
    // (the previous test in this block injects a vi.fn() mock and doesn't restore it).
    useAppStore.setState(useAppStore.getInitialState())
    useAppStore.setState({
      varNames: [],
      obsmKeys: ['X_umap'],
      obsColumnNames: ['cell_type'],
      loading: false,
      pendingViewport: null,
    } as any)
    const result = await applyConfig({ viewport: { target: [10, 20], zoom: 2 } })
    expect(result.ok).toBe(true)
    expect(useAppStore.getState().pendingViewport).toEqual({ target: [10, 20], zoom: 2 })
  })
})

describe('applyConfig — filterByExpression', () => {
  beforeEach(() => {
    useAppStore.setState({
      varNames: ['ENSG_CD8A'],
      obsmKeys: ['X_umap'],
      obsColumnNames: ['cell_type'],
      loading: false,
      geneLabelColumn: 'feature_name',
      geneLabelMap: new Map([['ENSG_CD8A', 'CD8A']]),
    } as any)
  })

  it('resolves a gene symbol to a var index and calls selectByExpression', async () => {
    const selectByExpression = vi
      .spyOn(useAppStore.getState(), 'selectByExpression')
      .mockResolvedValue()

    const result = await applyConfig({
      filterByExpression: { gene: 'CD8A', min: 2 },
    })

    expect(result.ok).toBe(true)
    expect(selectByExpression).toHaveBeenCalledWith('ENSG_CD8A', 2, null)
    selectByExpression.mockRestore()
  })

  it('returns field_value_invalid when neither min nor max is set', async () => {
    const result = await applyConfig({ filterByExpression: { gene: 'CD8A' } })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('filterByExpression')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('returns field_value_invalid when min > max', async () => {
    const result = await applyConfig({
      filterByExpression: { gene: 'CD8A', min: 5, max: 1 },
    })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('filterByExpression')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('returns field_value_invalid for unknown gene', async () => {
    const result = await applyConfig({
      filterByExpression: { gene: 'NOT_A_GENE', min: 0 },
    })
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason.kind === 'field_value_invalid') {
      expect(result.reason.field).toBe('filterByExpression.gene')
      expect(result.reason.value).toBe('NOT_A_GENE')
    } else {
      throw new Error('expected field_value_invalid error')
    }
  })

  it('defaults summaryContext to "selections" when filterByExpression is set', async () => {
    const selectByExpression = vi
      .spyOn(useAppStore.getState(), 'selectByExpression')
      .mockResolvedValue()
    useAppStore.setState({ summaryContext: 'all' } as any)

    await applyConfig({ filterByExpression: { gene: 'CD8A', min: 2 } })

    expect(useAppStore.getState().summaryContext).toBe('selections')
    selectByExpression.mockRestore()
  })
})
