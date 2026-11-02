import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// POST /api/datasets/{slug}/access, as the store sees it.
const postMock = vi.fn()
vi.mock('../api', () => ({ api: { POST: postMock, GET: vi.fn() } }))

import useAppStore from './useAppStore'

const PRIVATE = {
  slug: 'priv',
  name: 'Private',
  description: null,
  is_public: false,
  url: null,
  chat_enabled: false,
}
const STORE_URL = 'https://assets.example.org/team/priv.zarr'

function signedCookieAccess(expiresInMs: number) {
  return {
    data: {
      url: STORE_URL,
      credential_type: 'signed_cookies',
      expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    },
    response: { status: 200 },
  }
}

describe('openCatalogDataset with private datasets', () => {
  let openDataset: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    postMock.mockReset()
    openDataset = vi.fn().mockResolvedValue(undefined)
    useAppStore.setState({
      openDataset: openDataset as never,
      catalogDatasets: [PRIVATE],
      loadingError: null as never,
      datasetSlug: null,
    })
  })

  afterEach(() => {
    // Leave no refresh timer armed for the next test.
    useAppStore.getState().cancelAccessRefresh()
    vi.useRealTimers()
  })

  it('opens a signed-cookie dataset with cookies included', async () => {
    postMock.mockResolvedValue(signedCookieAccess(30 * 60_000))
    await useAppStore.getState().openCatalogDataset('priv')
    expect(openDataset).toHaveBeenCalledWith(STORE_URL, { credentials: 'include' })
  })

  it('still opens a bearer-token dataset with an Authorization header', async () => {
    postMock.mockResolvedValue({
      data: { url: STORE_URL, credential_type: 'bearer_token', token: 'tok', expires_at: 'x' },
      response: { status: 200 },
    })
    await useAppStore.getState().openCatalogDataset('priv')
    expect(openDataset).toHaveBeenCalledWith(STORE_URL, { headers: { Authorization: 'Bearer tok' } })
  })

  it('renews signed cookies before they expire', async () => {
    // Each /access call mints a fresh 30-minute expiry, as the API does.
    postMock.mockImplementation(async () => signedCookieAccess(30 * 60_000))
    await useAppStore.getState().openCatalogDataset('priv')
    expect(postMock).toHaveBeenCalledTimes(1)

    // Not yet: well inside the 30-minute window.
    await vi.advanceTimersByTimeAsync(20 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(1)

    // Renewed ahead of expiry, and the renewal arms the next one.
    await vi.advanceTimersByTimeAsync(9 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(29 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(3)
  })

  it('stops renewing once another dataset is open', async () => {
    postMock.mockResolvedValue(signedCookieAccess(30 * 60_000))
    await useAppStore.getState().openCatalogDataset('priv')
    useAppStore.setState({ datasetSlug: 'something-else' })

    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('stops renewing after a renewal is refused', async () => {
    postMock.mockResolvedValueOnce(signedCookieAccess(30 * 60_000))
    postMock.mockResolvedValue({ data: undefined, error: { detail: 'Insufficient permissions' }, response: { status: 403 } })
    await useAppStore.getState().openCatalogDataset('priv')

    await vi.advanceTimersByTimeAsync(29 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(postMock).toHaveBeenCalledTimes(2)
  })
})
