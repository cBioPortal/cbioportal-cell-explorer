import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getMock = vi.fn()
vi.mock('../api', () => ({ api: { GET: getMock, POST: vi.fn().mockResolvedValue({ data: undefined }) } }))
vi.mock('../utils/datasetProbe', () => ({ probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3 }) }))

import Collection from './Collection'

const DETAIL = {
  slug: 'a-study',
  name: 'A Study',
  description: 'About it',
  publication_url: 'https://example.org/paper',
  publication_citation: 'Author et al. 2025',
  dataset_count: 1,
  datasets: [
    {
      slug: 'ds1',
      name: 'Dataset One',
      description: null,
      is_public: true,
      url: 'https://cdn/ds1.zarr',
      chat_enabled: false,
    },
  ],
}

function renderAt(slug: string) {
  render(
    <MemoryRouter initialEntries={[`/collections/${slug}`]}>
      <Routes>
        <Route path="/collections/:slug" element={<Collection />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Collection page', () => {
  beforeEach(() => getMock.mockReset())
  afterEach(cleanup)

  it('renders the name, description and datasets', async () => {
    getMock.mockResolvedValue({ data: DETAIL })
    renderAt('a-study')
    await waitFor(() => expect(screen.getByText('A Study')).toBeDefined())
    expect(screen.getByText('About it')).toBeDefined()
    expect(screen.getByText('Dataset One')).toBeDefined()
  })

  it('renders the publication as a link with the citation as its text', async () => {
    getMock.mockResolvedValue({ data: DETAIL })
    renderAt('a-study')
    await waitFor(() => expect(screen.getByText('A Study')).toBeDefined())
    const link = screen.getByRole('link', { name: /Author et al\. 2025/ })
    expect(link.getAttribute('href')).toBe('https://example.org/paper')
  })

  it('requests the slug from the route', async () => {
    getMock.mockResolvedValue({ data: DETAIL })
    renderAt('a-study')
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith('/api/collections/{slug}', {
        params: { path: { slug: 'a-study' } },
      }),
    )
  })

  it('shows a not-found message when the API returns no data', async () => {
    getMock.mockResolvedValue({ data: undefined, error: { detail: 'Collection not found' } })
    renderAt('missing')
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeDefined())
  })

  it('shows the same not-found message when the request throws', async () => {
    // ...Once, deliberately. A persistent rejecting mock stays installed past
    // the assertion, and a later call during teardown produces a second
    // rejection that nothing awaits — vitest then fails the file on an
    // unhandled error even though the component caught the first one. Scoping
    // it to the single call the component makes avoids that.
    getMock.mockImplementationOnce(async () => {
      throw new Error('network')
    })
    renderAt('a-study')
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeDefined())
  })
})
