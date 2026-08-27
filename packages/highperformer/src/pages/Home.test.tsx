import { cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../api', () => ({
  api: { GET: vi.fn().mockResolvedValue({ data: undefined }), POST: vi.fn().mockResolvedValue({ data: undefined }) },
}))
vi.mock('../utils/datasetProbe', () => ({
  probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3, shape: { nObs: 3000, nVar: 500 } }),
}))

import useAppStore from '../store/useAppStore'
import { STORAGE_KEY } from '../utils/datasets'
import Home from './Home'

const LUNG = {
  slug: 'lung-atlas',
  name: 'Lung Atlas',
  description: 'Non-small cell lung cancer',
  is_public: true,
  url: 'https://cdn/lung.zarr',
  chat_enabled: false,
  collection: { slug: 'lung', name: 'Lung' },
  facets: { tissue: ['lung'], cell_type: ['T cell'] },
}

const BREAST = {
  slug: 'breast-atlas',
  name: 'Breast Atlas',
  description: 'Ductal carcinoma',
  is_public: true,
  url: 'https://cdn/breast.zarr',
  chat_enabled: false,
  collection: null,
  facets: { tissue: ['breast'], cell_type: ['epithelial cell'] },
}

const COLLECTION = {
  slug: 'lung',
  name: 'Lung',
  description: 'Lung studies',
  publication_url: null,
  publication_citation: null,
  dataset_count: 4,
}

function setStore(overrides: Record<string, unknown>) {
  useAppStore.setState({
    backendProbed: true,
    backendInfo: { auth_enabled: false } as never,
    user: null,
    catalogDatasets: [],
    collections: [],
    fetchCollections: vi.fn(),
    facetDefs: [
      { key: 'tissue', label: 'Tissue', order: 10 },
      { key: 'cell_type', label: 'Cell type', order: 20 },
    ],
    ...overrides,
  })
}

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>)

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear()
    setStore({})
  })
  afterEach(cleanup)

  it('reports dataset, cell and collection figures in the header', async () => {
    setStore({ catalogDatasets: [LUNG, BREAST], collections: [COLLECTION] })
    const { container } = renderHome()
    const overview = within(container.querySelector('.ce-stats') as HTMLElement)

    expect(overview.getByText('Datasets')).toBeDefined()
    expect(overview.getByText('2')).toBeDefined()
    // Both datasets probe at 3000 cells each.
    await waitFor(() => expect(overview.getByText('6K')).toBeDefined())
    // Scope to the Collections stat: "1" also appears as the dataset count.
    const stat = overview.getByText('Collections').closest('.ce-stat') as HTMLElement
    expect(within(stat).getByText('1')).toBeDefined()
  })

  it('omits the collections figure when no backend serves them', () => {
    setStore({ backendInfo: null })
    const { container } = renderHome()
    const overview = within(container.querySelector('.ce-stats') as HTMLElement)
    expect(overview.queryByText('Collections')).toBeNull()
    expect(overview.getByText('Datasets')).toBeDefined()
  })

  it('shows the wordmark and what the tool does', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Cell Explorer' })).toBeDefined()
    expect(screen.getByText(/Explore millions of cells/)).toBeDefined()
  })

  it('carries the cBioPortal mark, with an accessible name', () => {
    renderHome()
    expect(screen.getByRole('img', { name: 'cBioPortal' })).toBeDefined()
  })

  it('lists every catalog dataset with a count', () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    renderHome()
    expect(screen.getByText('2 datasets')).toBeDefined()
    expect(screen.getByText('Lung Atlas')).toBeDefined()
    expect(screen.getByText('Breast Atlas')).toBeDefined()
  })

  it('filters the list as you search, across name and description', () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    renderHome()
    fireEvent.change(screen.getByLabelText('Search datasets'), { target: { value: 'ductal' } })
    expect(screen.getByText('Breast Atlas')).toBeDefined()
    expect(screen.queryByText('Lung Atlas')).toBeNull()
    expect(screen.getByText('1 dataset')).toBeDefined()
  })

  it('tells you when nothing matches, quoting the search', () => {
    setStore({ catalogDatasets: [LUNG] })
    renderHome()
    fireEvent.change(screen.getByLabelText('Search datasets'), { target: { value: 'kidney' } })
    expect(screen.getByText(/No datasets match/)).toBeDefined()
    expect(screen.getByText(/kidney/)).toBeDefined()
  })

  it('puts locally saved URLs in the Unannotated tab, not alongside catalog rows', async () => {
    // A pasted URL has no catalog row and so declares no facets. It belongs
    // with the unannotated half rather than vanishing when a facet is picked.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['https://cdn/mine.zarr']))
    setStore({ catalogDatasets: [LUNG] })
    renderHome()

    expect(screen.getByText('Lung Atlas')).toBeDefined()
    expect(screen.queryByText('mine.zarr')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Unannotated/ }))
    await waitFor(() => expect(screen.getByText('mine.zarr')).toBeDefined())
    expect(screen.getByText('Local')).toBeDefined()
  })

  it('reports the collection count even though the chips row is gone', () => {
    setStore({ catalogDatasets: [LUNG], collections: [COLLECTION] })
    const { container } = renderHome()
    const overview = within(container.querySelector('.ce-stats') as HTMLElement)
    // Scope to the Collections stat: "1" also appears as the dataset count.
    const stat = overview.getByText('Collections').closest('.ce-stat') as HTMLElement
    expect(within(stat).getByText('1')).toBeDefined()
  })

  it('names the active filters beside the results, not only in the sidebar', async () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    const { container } = renderHome()
    const sidebar = within(container.querySelector('.ce-facets') as HTMLElement)
    fireEvent.click(sidebar.getByText('lung'))

    const active = await waitFor(() => container.querySelector('.ce-active') as HTMLElement)
    expect(within(active).getByText('Tissue')).toBeDefined()
    expect(within(active).getByText('lung')).toBeDefined()
  })

  it('removes a filter from its chip', async () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    const { container } = renderHome()
    const sidebar = within(container.querySelector('.ce-facets') as HTMLElement)
    fireEvent.click(sidebar.getByText('lung'))
    await waitFor(() => expect(screen.queryByText('Breast Atlas')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Remove filter Tissue: lung/ }))
    await waitFor(() => expect(screen.getByText('Breast Atlas')).toBeDefined())
    expect(container.querySelector('.ce-active')).toBeNull()
  })

  it('shows no filter chips when nothing is filtering', () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    const { container } = renderHome()
    expect(container.querySelector('.ce-active')).toBeNull()
  })

  it('offers no way to add a URL from the search bar', () => {
    renderHome()
    expect(screen.queryByRole('button', { name: /Add URL/ })).toBeNull()
  })

  it('removing a local URL drops it from storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['https://cdn/mine.zarr']))
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: /^Remove / }))
    await waitFor(() => expect(screen.queryByText('mine.zarr')).toBeNull())
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([])
  })

  it('shows no tabs when every dataset is unannotated, and lists them all', () => {
    // The real catalogue today: the backend indexes nothing, so nothing is
    // annotated. A default Annotated tab would render empty.
    setStore({
      facetDefs: [],
      catalogDatasets: [
        { ...LUNG, facets: undefined },
        { ...BREAST, facets: undefined },
      ],
    })
    renderHome()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('Lung Atlas')).toBeDefined()
    expect(screen.getByText('Breast Atlas')).toBeDefined()
    expect(screen.getByText('2 datasets')).toBeDefined()
  })

  it('splits into tabs only when both halves exist', () => {
    setStore({ catalogDatasets: [LUNG, { ...BREAST, facets: {} }] })
    renderHome()
    const tabs = screen.getByRole('tablist')
    expect(within(tabs).getByRole('tab', { name: /Annotated/ }).getAttribute('aria-selected')).toBe('true')
    // The annotated half is what shows by default.
    expect(screen.getByText('Lung Atlas')).toBeDefined()
    expect(screen.queryByText('Breast Atlas')).toBeNull()
  })

  it('offers facet values with dataset counts', () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    const { container } = renderHome()
    const sidebar = within(container.querySelector('.ce-facets') as HTMLElement)
    expect(sidebar.getByText('Tissue')).toBeDefined()
    expect(sidebar.getByText('lung')).toBeDefined()
    expect(sidebar.getByText('breast')).toBeDefined()
  })

  it('ticking a facet value narrows the list and lands in the URL', async () => {
    setStore({ catalogDatasets: [LUNG, BREAST] })
    const { container } = renderHome()
    const sidebar = within(container.querySelector('.ce-facets') as HTMLElement)

    fireEvent.click(sidebar.getByText('lung'))

    await waitFor(() => expect(screen.queryByText('Breast Atlas')).toBeNull())
    expect(screen.getByText('Lung Atlas')).toBeDefined()
    expect(screen.getByText('1 dataset')).toBeDefined()
  })

  it('without a backend, still offers search and hides collections', () => {
    setStore({ backendInfo: null, collections: [COLLECTION] })
    renderHome()
    expect(screen.getByLabelText('Search datasets')).toBeDefined()
    expect(screen.queryByRole('link', { name: /Lung/ })).toBeNull()
    expect(screen.getByText(/No datasets available/)).toBeDefined()
  })

  it('invites a signed-out user to sign in when auth is on and the catalog is empty', () => {
    setStore({ backendInfo: { auth_enabled: true } as never, user: null })
    renderHome()
    expect(screen.getByText(/Sign in to see the datasets available to you/)).toBeDefined()
  })
})
