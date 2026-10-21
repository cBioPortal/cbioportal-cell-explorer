import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// jsdom has no WebGL; the canvas is irrelevant to what is saved.
vi.mock('@deck.gl/react', () => ({ DeckGL: () => null }))
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
