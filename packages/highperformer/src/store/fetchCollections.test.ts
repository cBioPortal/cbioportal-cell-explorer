import { describe, it, expect, vi, beforeEach } from 'vitest'

const getMock = vi.fn()
vi.mock('../api', () => ({ api: { GET: getMock, POST: vi.fn() } }))

import useAppStore from './useAppStore'

const COLLECTION = {
  slug: 'a-study',
  name: 'A Study',
  description: 'About it',
  publication_url: 'https://example.org/paper',
  publication_citation: 'Author et al. 2025',
  dataset_count: 3,
}

describe('fetchCollections', () => {
  beforeEach(() => {
    getMock.mockReset()
    useAppStore.setState({ collections: [] })
  })

  it('stores the collections the API returns', async () => {
    getMock.mockResolvedValue({ data: { collections: [COLLECTION] } })
    await useAppStore.getState().fetchCollections()
    expect(useAppStore.getState().collections).toEqual([COLLECTION])
    expect(getMock).toHaveBeenCalledWith('/api/collections')
  })

  it('keeps the existing collections when the request fails', async () => {
    useAppStore.setState({ collections: [COLLECTION] })
    getMock.mockRejectedValue(new Error('backend down'))
    await useAppStore.getState().fetchCollections()
    expect(useAppStore.getState().collections).toEqual([COLLECTION])
  })

  it('keeps the existing collections when the response has no body', async () => {
    useAppStore.setState({ collections: [COLLECTION] })
    getMock.mockResolvedValue({ data: undefined })
    await useAppStore.getState().fetchCollections()
    expect(useAppStore.getState().collections).toEqual([COLLECTION])
  })
})
