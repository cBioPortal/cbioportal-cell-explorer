import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../api', () => ({ api: { GET: vi.fn().mockResolvedValue({ data: undefined }), POST: vi.fn().mockResolvedValue({ data: undefined }) } }))
vi.mock('../utils/datasetProbe', () => ({ probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3 }) }))

import useAppStore from '../store/useAppStore'
import { CollectionsTab } from './Home'

afterEach(() => cleanup())

const COLLECTION = {
  slug: 'a-study',
  name: 'A Study',
  description: 'About it',
  publication_url: null,
  publication_citation: null,
  dataset_count: 3,
}

const UNGROUPED = {
  slug: 'solo',
  name: 'Solo Dataset',
  description: null,
  is_public: true,
  url: 'https://cdn/solo.zarr',
  chat_enabled: false,
}

function renderTab() {
  render(<MemoryRouter><CollectionsTab /></MemoryRouter>)
}

describe('CollectionsTab', () => {
  beforeEach(() => {
    useAppStore.setState({
      collections: [],
      catalogDatasets: [],
      fetchCollections: vi.fn().mockResolvedValue(undefined) as never,
    })
  })

  it('lists each collection with its name, description and dataset count', () => {
    useAppStore.setState({ collections: [COLLECTION] })
    renderTab()
    expect(screen.getByText('A Study')).toBeDefined()
    expect(screen.getByText('About it')).toBeDefined()
    expect(screen.getByText(/3 datasets/)).toBeDefined()
  })

  it('links each collection to its page', () => {
    useAppStore.setState({ collections: [COLLECTION] })
    renderTab()
    const link = screen.getByRole('link', { name: /A Study/ })
    expect(link.getAttribute('href')).toBe('/collections/a-study')
  })

  it('shows datasets with no collection under an Ungrouped heading', () => {
    useAppStore.setState({ collections: [COLLECTION], catalogDatasets: [UNGROUPED] })
    renderTab()
    expect(screen.getByText('Ungrouped')).toBeDefined()
    expect(screen.getByText('Solo Dataset')).toBeDefined()
  })

  it('omits the Ungrouped section when every dataset belongs to a collection', () => {
    useAppStore.setState({
      collections: [COLLECTION],
      catalogDatasets: [{ ...UNGROUPED, collection: { slug: 'a-study', name: 'A Study' } }],
    })
    renderTab()
    expect(screen.queryByText('Ungrouped')).toBeNull()
  })

  it('uses the singular for a collection with one dataset', () => {
    useAppStore.setState({ collections: [{ ...COLLECTION, dataset_count: 1 }] })
    renderTab()
    expect(screen.getByText(/1 dataset(?!s)/)).toBeDefined()
  })
})
