import { describe, it, expect } from 'vitest'
import {
  countsFor,
  catalogToEntry,
  localToEntry,
  mergeSavedUrls,
  type DatasetEntry,
} from './datasetEntries'
import type { ProbeResult } from '../hooks/useDatasetProbes'

const entry = (over: Partial<DatasetEntry> = {}): DatasetEntry => ({
  key: 'k',
  kind: 'catalog',
  name: 'Atlas',
  description: null,
  url: 'https://cdn.example.com/a.zarr',
  isPublic: true,
  ...over,
})

const probe = (over: Partial<ProbeResult> = {}): ProbeResult => ({ status: 'ok', ...over })

describe('countsFor', () => {
  it('prefers the catalog counts the API supplied', () => {
    const result = countsFor(entry({ counts: { nObs: 100, nVar: 20 } }), probe({ shape: { nObs: 7 } }))
    expect(result).toEqual({ nObs: 100, nVar: 20 })
  })

  it('falls back to the probe when the entry has no counts', () => {
    // Pasted URLs have no catalog row, so the probe is their only source.
    const result = countsFor(entry({ kind: 'local', counts: undefined }), probe({ shape: { nObs: 7, nVar: 3 } }))
    expect(result).toEqual({ nObs: 7, nVar: 3 })
  })

  it('returns undefined when neither source has counts', () => {
    expect(countsFor(entry(), probe())).toBeUndefined()
    expect(countsFor(entry(), undefined)).toBeUndefined()
  })

  it('uses catalog counts even before the probe has answered', () => {
    // The whole point: the row renders and sorts without waiting on the network.
    expect(countsFor(entry({ counts: { nObs: 42 } }), probe({ status: 'pending' }))).toEqual({ nObs: 42 })
  })

  it('keeps catalog counts when the liveness probe reports the store unreachable', () => {
    // A store we cannot reach right now still has a known size; the status dot
    // conveys reachability, the count conveys size. They are separate facts.
    expect(countsFor(entry({ counts: { nObs: 42 } }), probe({ status: 'error' }))).toEqual({ nObs: 42 })
  })
})

describe('catalogToEntry', () => {
  const base = {
    slug: 'atlas',
    name: 'Atlas',
    description: null,
    is_public: true,
    url: 'https://cdn.example.com/a.zarr',
    chat_enabled: false,
  }

  it('maps the API metadata onto counts', () => {
    const result = catalogToEntry({
      ...base,
      metadata: { n_obs: 927205, n_vars: 31815 },
    } as Parameters<typeof catalogToEntry>[0])
    expect(result.counts).toEqual({ nObs: 927205, nVar: 31815 })
  })

  it('leaves counts undefined when the dataset was never harvested', () => {
    const result = catalogToEntry({ ...base, metadata: null } as Parameters<typeof catalogToEntry>[0])
    expect(result.counts).toBeUndefined()
  })
})

describe('localToEntry', () => {
  it('has no counts — a pasted URL has no catalog row to read them from', () => {
    expect(localToEntry('https://example.com/x.zarr').counts).toBeUndefined()
  })
})

describe('mergeSavedUrls', () => {
  const catalog = [
    catalogToEntry({
      slug: 'spectrum',
      name: 'MSK SPECTRUM TME 2022',
      description: 'Curated',
      is_public: true,
      url: 'https://cdn/spectrum.zarr',
      chat_enabled: false,
      metadata: { n_obs: 927205, n_vars: 31815 },
    }),
    catalogToEntry({
      slug: 'other',
      name: 'Other',
      description: null,
      is_public: true,
      url: 'https://cdn/other.zarr',
      chat_enabled: false,
    }),
  ]

  it('lists a store once when a saved URL points at a catalogue dataset', () => {
    const out = mergeSavedUrls(['https://cdn/spectrum.zarr'], catalog)
    expect(out).toHaveLength(2)
    expect(out.map((e) => e.key)).toEqual(['spectrum', 'other'])
  })

  it('keeps the catalogue row, not the bare URL row', () => {
    const [merged] = mergeSavedUrls(['https://cdn/spectrum.zarr'], catalog)
    expect(merged.name).toBe('MSK SPECTRUM TME 2022')
    expect(merged.description).toBe('Curated')
    expect(merged.counts).toEqual({ nObs: 927205, nVar: 31815 })
  })

  it('carries savedUrl onto the merged row so it stays removable', () => {
    const [merged] = mergeSavedUrls(['https://cdn/spectrum.zarr'], catalog)
    expect(merged.savedUrl).toBe('https://cdn/spectrum.zarr')
    expect(merged.kind).toBe('catalog')
  })

  it('treats a trailing slash as the same store', () => {
    const out = mergeSavedUrls(['https://cdn/spectrum.zarr/'], catalog)
    expect(out).toHaveLength(2)
    expect(out[0].savedUrl).toBe('https://cdn/spectrum.zarr/')
  })

  it('keeps a saved URL that matches nothing, and leads with it', () => {
    const out = mergeSavedUrls(['https://cdn/mine.zarr'], catalog)
    expect(out.map((e) => e.key)).toEqual(['https://cdn/mine.zarr', 'spectrum', 'other'])
    expect(out[0].kind).toBe('local')
  })

  it('does not double-count cells once merged', () => {
    const out = mergeSavedUrls(['https://cdn/spectrum.zarr'], catalog)
    const total = out.reduce((n, e) => n + (e.counts?.nObs ?? 0), 0)
    expect(total).toBe(927205)
  })

  it('leaves the catalogue alone when nothing is saved', () => {
    expect(mergeSavedUrls([], catalog).map((e) => e.key)).toEqual(['spectrum', 'other'])
  })
})
