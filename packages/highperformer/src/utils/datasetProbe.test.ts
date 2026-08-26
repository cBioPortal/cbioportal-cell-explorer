import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeStore, isLocalUrl, parseStoreShape } from './datasetProbe'

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

describe('parseStoreShape', () => {
  it('reads a dense X from v3 consolidated metadata', () => {
    // Shape as served by the live MSK SPECTRUM store.
    const doc = {
      zarr_format: 3,
      consolidated_metadata: {
        kind: 'inline',
        metadata: { X: { node_type: 'array', shape: [927205, 31815] } },
      },
    }
    expect(parseStoreShape(doc, 3)).toEqual({ nObs: 927205, nVar: 31815 })
  })

  it('reads a sparse X from its group attributes in v3', () => {
    const doc = {
      consolidated_metadata: {
        metadata: {
          X: { node_type: 'group', attributes: { 'encoding-type': 'csr_matrix', shape: [5000, 200] } },
        },
      },
    }
    expect(parseStoreShape(doc, 3)).toEqual({ nObs: 5000, nVar: 200 })
  })

  it('falls back to the obs index length when v3 has no X', () => {
    const doc = {
      consolidated_metadata: {
        metadata: {
          obs: { node_type: 'group', attributes: { _index: 'cell_id' } },
          'obs/cell_id/codes': { node_type: 'array', shape: [927205] },
        },
      },
    }
    expect(parseStoreShape(doc, 3)).toEqual({ nObs: 927205 })
  })

  it('reads a dense X from v2 .zmetadata', () => {
    const doc = { metadata: { 'X/.zarray': { shape: [2700, 32738] } } }
    expect(parseStoreShape(doc, 2)).toEqual({ nObs: 2700, nVar: 32738 })
  })

  it('reads a sparse X from v2 .zattrs', () => {
    const doc = { metadata: { 'X/.zattrs': { 'encoding-type': 'csr_matrix', shape: [2700, 32738] } } }
    expect(parseStoreShape(doc, 2)).toEqual({ nObs: 2700, nVar: 32738 })
  })

  it('returns undefined for a layout it does not recognise', () => {
    expect(parseStoreShape({ zarr_format: 3 }, 3)).toBeUndefined()
    expect(parseStoreShape({ metadata: {} }, 2)).toBeUndefined()
    expect(parseStoreShape(null, 3)).toBeUndefined()
    expect(parseStoreShape('nonsense', 2)).toBeUndefined()
  })

  it('ignores zero and negative dimensions rather than reporting them', () => {
    const doc = { consolidated_metadata: { metadata: { X: { shape: [0, 100] } } } }
    expect(parseStoreShape(doc, 3)).toBeUndefined()
  })
})

describe('probeStore shape reading', () => {
  it('attaches the shape when the metadata carries one', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consolidated_metadata: { metadata: { X: { shape: [10, 20] } } } }),
    } as unknown as Response)

    const result = await probeStore('http://example.com/store.zarr', AbortSignal.abort())
    expect(result).toEqual({ ok: true, version: 3, shape: { nObs: 10, nVar: 20 } })
  })

  it('still reports reachable when the body cannot be parsed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('not json') },
    } as unknown as Response)

    const result = await probeStore('http://example.com/store.zarr', AbortSignal.abort())
    expect(result).toEqual({ ok: true, version: 3 })
  })
})
