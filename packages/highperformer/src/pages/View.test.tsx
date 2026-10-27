import { act, cleanup, render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// jsdom has no WebGL, so DeckGL renders nothing. It records the layers each
// mount receives: a remount (new `key`) is a new WebGL context, and a layer
// instance initialized in the old one must not be handed to the new one.
const { deckMounts } = vi.hoisted(() => ({ deckMounts: [] as { id?: string }[][][] }))
vi.mock('@deck.gl/react', async () => {
  const React = await import('react')
  return {
    DeckGL: React.forwardRef(function DeckGL({ layers }: { layers?: { id?: string }[] }, _ref) {
      const renders = React.useRef<{ id?: string }[][] | null>(null)
      if (renders.current === null) {
        renders.current = []
        deckMounts.push(renders.current)
      }
      renders.current.push(layers ?? [])
      return null
    }),
  }
})
vi.mock('../api', () => ({
  api: { GET: vi.fn().mockResolvedValue({ data: undefined }), POST: vi.fn().mockResolvedValue({ data: undefined }) },
}))

import useAppStore from '../store/useAppStore'
import { STORAGE_KEY, loadDatasets } from '../utils/datasets'
import View from './View'

function renderView(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/view?${search}`]}>
      <View />
    </MemoryRouter>,
  )
}

describe('View dataset history', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      backendInfo: null,
      showDatasetDropdown: true,
      // Opening is stubbed to what the real actions leave behind: the store
      // pointing at the dataset's URL.
      openDataset: vi.fn(async (url: string) => useAppStore.setState({ datasetUrl: url })),
      openCatalogDataset: vi.fn(async () => useAppStore.setState({ datasetUrl: 'https://cdn/lung.zarr' })),
    })
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState({ datasetUrl: null })
  })

  it('does not save a catalog dataset opened by slug', async () => {
    renderView('dataset=lung-atlas')
    await vi.waitFor(() => expect(useAppStore.getState().datasetUrl).toBe('https://cdn/lung.zarr'))
    expect(loadDatasets()).toEqual([])
  })

  it('saves a URL opened with ?url=, newest first', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['https://cdn/older.zarr']))
    renderView(`url=${encodeURIComponent('https://cdn/mine.zarr')}`)
    await vi.waitFor(() => expect(loadDatasets()).toEqual(['https://cdn/mine.zarr', 'https://cdn/older.zarr']))
  })

  it('does not save the same URL twice', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['https://cdn/mine.zarr']))
    renderView(`url=${encodeURIComponent('https://cdn/mine.zarr')}`)
    await vi.waitFor(() => expect(useAppStore.getState().datasetUrl).toBe('https://cdn/mine.zarr'))
    expect(loadDatasets()).toEqual(['https://cdn/mine.zarr'])
  })
})

describe('View category labels across an embedding switch', () => {
  const embedding = (maxX: number) => ({
    positions: new Float32Array([0, 0, maxX, 1]),
    numPoints: 2,
    bounds: { minX: 0, maxX, minY: 0, maxY: 1 },
  })

  beforeEach(() => {
    deckMounts.length = 0
    useAppStore.setState({
      embeddingData: embedding(10),
      selectedEmbedding: 'X_umap',
      showCategoryLabels: true,
      categoryLabelsObsColumn: null,
      colorMode: 'category',
      selectedObsColumn: 'cell_type',
      categoryMap: [{ label: 'T cell', color: [1, 2, 3] }],
      highlightedCategories: new Set(),
      // Centroids for the next embedding are already cached, so the label
      // layer is rebuilt as soon as selectedEmbedding changes — before the
      // new positions arrive and remount the canvas.
      categoryCentroids: new Map([
        ['X_umap::cell_type', { positions: new Float32Array([5, 0.5]), counts: new Uint32Array([2]) }],
        ['X_pca::cell_type', { positions: new Float32Array([9, 0.5]), counts: new Uint32Array([2]) }],
      ]),
      ensureCategoryCentroids: vi.fn(async () => {}),
    })
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState({ embeddingData: null, showCategoryLabels: false, categoryCentroids: new Map() })
  })

  it('gives a remounted canvas a label layer it has not seen before', () => {
    render(
      <MemoryRouter initialEntries={['/view']}>
        <View />
      </MemoryRouter>,
    )
    act(() => useAppStore.setState({ selectedEmbedding: 'X_pca' }))
    act(() => useAppStore.setState({ embeddingData: embedding(20) }))

    expect(deckMounts.length).toBe(2)
    const labelLayer = (renders: { id?: string }[][]) =>
      renders.flat().filter((l) => l.id === 'category-labels')
    const firstMountLayers = new Set(labelLayer(deckMounts[0]))
    const secondMountLayers = labelLayer(deckMounts[1])
    expect(secondMountLayers.length).toBeGreaterThan(0)
    for (const layer of secondMountLayers) expect(firstMountLayers.has(layer)).toBe(false)
  })
})

describe('View URL view state', () => {
  let location = ''
  function LocationProbe() {
    location = useLocation().search
    return null
  }

  function renderWithProbe(search: string) {
    return render(
      <MemoryRouter initialEntries={[`/view?${search}`]}>
        <View />
        <LocationProbe />
      </MemoryRouter>,
    )
  }

  beforeEach(() => {
    location = ''
    useAppStore.setState({
      backendInfo: null,
      // Stubbed to the state a loaded dataset (with its default_view) leaves behind
      openCatalogDataset: vi.fn(async (slug: string) => useAppStore.setState({
        datasetUrl: 'https://cdn/lung.zarr',
        datasetSlug: slug,
        loading: false,
        loadingError: null,
        obsmKeys: ['X_umap', 'X_pca'],
        selectedEmbedding: 'X_umap',
        obsColumnNames: ['cell_type', 'sample'],
        varNames: ['ENSG1', 'ENSG2'],
        geneLabelColumn: null,
        geneLabelMap: new Map([['ENSG1', 'EGFR']]),
        colorMode: 'category',
        selectedObsColumn: 'sample',
        selectedGene: null,
        colorScaleName: 'viridis',
      })),
      setSelectedEmbedding: vi.fn((key: string) => useAppStore.setState({ selectedEmbedding: key })),
      setColorMode: vi.fn((mode) => useAppStore.setState({ colorMode: mode })),
      selectGene: vi.fn((name: string) => useAppStore.setState({ selectedGene: name })),
      selectObsColumn: vi.fn((name: string) => useAppStore.setState({ selectedObsColumn: name })),
      setColorScaleName: vi.fn((name: string) => useAppStore.setState({ colorScaleName: name })),
      addSummaryObsColumn: vi.fn(),
      addSummaryGene: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    useAppStore.setState({ datasetUrl: null, datasetSlug: null })
  })

  it('applies view params on top of the default view', async () => {
    renderWithProbe('dataset=lung&embedding=X_pca&gene=EGFR&colorScale=magma')
    await vi.waitFor(() => expect(useAppStore.getState().colorScaleName).toBe('magma'))
    const state = useAppStore.getState()
    expect(state.selectedEmbedding).toBe('X_pca')
    expect(state.colorMode).toBe('gene')
    expect(state.selectedGene).toBe('ENSG1')
    expect(new URLSearchParams(location).get('gene')).toBe('EGFR')
  })

  it('writes the loaded view into the URL, then follows store changes', async () => {
    renderWithProbe('dataset=lung')
    await vi.waitFor(() => expect(location).toBe('?dataset=lung&embedding=X_umap&colorBy=sample'))
    act(() => useAppStore.setState({ selectedObsColumn: 'cell_type' }))
    await vi.waitFor(() => expect(location).toBe('?dataset=lung&embedding=X_umap&colorBy=cell_type'))
    act(() => useAppStore.setState({ colorMode: 'gene', selectedGene: 'ENSG1' }))
    await vi.waitFor(() => expect(location).toBe('?dataset=lung&embedding=X_umap&gene=EGFR'))
  })

  it('leaves the URL alone when ?config= is used', async () => {
    const config = encodeURIComponent(JSON.stringify({ dataset: 'lung' }))
    renderWithProbe(`config=${config}`)
    await vi.waitFor(() => expect(useAppStore.getState().datasetSlug).toBe('lung'))
    act(() => useAppStore.setState({ selectedObsColumn: 'cell_type' }))
    await new Promise((r) => setTimeout(r, 400))
    expect(location).toBe(`?config=${config}`)
  })
})
