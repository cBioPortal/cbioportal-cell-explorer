import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock applyConfig before importing parseConfig so the module uses the mock
const mockApplyConfig = vi.fn()
vi.mock('./applyConfig', () => ({
  applyConfig: (...args: unknown[]) => mockApplyConfig(...args),
}))

const { parseConfig, applyParsedConfig } = await import('./parseConfig')
const { default: useAppStore } = await import('../store/useAppStore')

beforeEach(() => {
  mockApplyConfig.mockReset()
  mockApplyConfig.mockResolvedValue({ ok: true })
  useAppStore.setState(useAppStore.getInitialState())
})

describe('parseConfig', () => {
  it('returns null when no config param', () => {
    expect(parseConfig(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseConfig('')).toBeNull()
  })

  it('parses valid JSON config', () => {
    const json = JSON.stringify({ url: 'https://example.com/data.zarr' })
    const result = parseConfig(json)
    expect(result).not.toBeNull()
    expect(result!.url).toBe('https://example.com/data.zarr')
  })

  it('parses URL-encoded JSON config', () => {
    const json = JSON.stringify({ url: 'https://example.com/data.zarr', embedding: 'X_umap' })
    const encoded = encodeURIComponent(json)
    const result = parseConfig(encoded)
    expect(result).not.toBeNull()
    expect(result!.embedding).toBe('X_umap')
  })

  it('returns null and warns on invalid JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = parseConfig('not-json')
    expect(result).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns null and warns on invalid schema', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const json = JSON.stringify({ showHeader: 'not-a-boolean' }) // invalid type, no url or dataset
    const result = parseConfig(json)
    expect(result).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('handles double-encoded config', () => {
    const json = JSON.stringify({ url: 'https://example.com/data.zarr' })
    const doubleEncoded = encodeURIComponent(encodeURIComponent(json))
    const result = parseConfig(doubleEncoded)
    expect(result).not.toBeNull()
    expect(result!.url).toBe('https://example.com/data.zarr')
  })
})

describe('applyParsedConfig', () => {
  it('does nothing when configParam is null', async () => {
    await applyParsedConfig(null)
    expect(mockApplyConfig).not.toHaveBeenCalled()
    expect(useAppStore.getState().loadingError).toBeNull()
  })

  it('calls applyConfig with parsed config on valid input', async () => {
    const json = JSON.stringify({ url: 'https://example.com/data.zarr' })
    await applyParsedConfig(json)
    expect(mockApplyConfig).toHaveBeenCalledTimes(1)
    expect(mockApplyConfig).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com/data.zarr' }))
    expect(useAppStore.getState().loadingError).toBeNull()
  })

  it('sets loadingError when applyConfig returns !ok', async () => {
    mockApplyConfig.mockResolvedValue({
      ok: false,
      reason: { kind: 'missing_companion', field: 'gene' },
    })
    const json = JSON.stringify({ colorBy: 'gene' })
    await applyParsedConfig(json)
    expect(useAppStore.getState().loadingError).toBe(
      "Couldn't apply: colorBy is set but gene is missing"
    )
  })

  it('does not set loadingError when applyConfig returns ok', async () => {
    const json = JSON.stringify({ url: 'https://example.com/data.zarr' })
    await applyParsedConfig(json)
    expect(useAppStore.getState().loadingError).toBeNull()
  })
})
