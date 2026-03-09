import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeStore, isLocalUrl } from './datasetProbe'

describe('isLocalUrl', () => {
  it('returns true for localhost', () => {
    expect(isLocalUrl('http://localhost:3005/test.zarr')).toBe(true)
  })

  it('returns true for 127.0.0.1', () => {
    expect(isLocalUrl('http://127.0.0.1:8080/data.zarr')).toBe(true)
  })

  it('returns true for 0.0.0.0', () => {
    expect(isLocalUrl('http://0.0.0.0:3000/store.zarr/')).toBe(true)
  })

  it('returns false for remote URLs', () => {
    expect(isLocalUrl('https://example.com/data.zarr')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isLocalUrl('not-a-url')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isLocalUrl('')).toBe(false)
  })
})

describe('probeStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok with version 3 when zarr.json succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as Response)

    const result = await probeStore('http://example.com/store.zarr', AbortSignal.abort())
    expect(result).toEqual({ ok: true, version: 3 })
    expect(fetch).toHaveBeenCalledWith('http://example.com/store.zarr/zarr.json', expect.objectContaining({ method: 'GET' }))
  })

  it('falls back to .zmetadata when zarr.json fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)

    const result = await probeStore('http://example.com/store.zarr/', AbortSignal.abort())
    expect(result).toEqual({ ok: true, version: 2 })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith('http://example.com/store.zarr/.zmetadata', expect.objectContaining({ method: 'GET' }))
  })

  it('returns not ok when both fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)

    const result = await probeStore('http://example.com/store.zarr', AbortSignal.abort())
    expect(result).toEqual({ ok: false })
  })

  it('appends trailing slash if missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as Response)

    await probeStore('http://example.com/store.zarr', AbortSignal.abort())
    expect(fetch).toHaveBeenCalledWith('http://example.com/store.zarr/zarr.json', expect.anything())
  })

  it('does not double trailing slash', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true } as Response)

    await probeStore('http://example.com/store.zarr/', AbortSignal.abort())
    expect(fetch).toHaveBeenCalledWith('http://example.com/store.zarr/zarr.json', expect.anything())
  })
})
