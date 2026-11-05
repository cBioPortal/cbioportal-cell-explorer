import { describe, it, expect, vi } from 'vitest'
import { parseConfig } from './parseConfig'

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
