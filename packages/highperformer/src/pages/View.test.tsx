import { act, cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
