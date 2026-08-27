import type useAppStore from '../store/useAppStore'
import type { StoreShape } from './datasetProbe'
import type { ProbeResult } from '../hooks/useDatasetProbes'

type CatalogDataset = ReturnType<typeof useAppStore.getState>['catalogDatasets'][number]

/**
 * One row in the landing page's result list. Catalog datasets and URLs the user
 * pasted are both datasets you can open, so they share a shape and a list —
 * `kind` only decides how the row is opened and whether it can be removed.
 */
export interface DatasetEntry {
  /** Stable identity: the catalog slug, or the URL itself for local entries. */
  key: string
  kind: 'catalog' | 'local'
  name: string
  description: string | null
  /** Null for private catalog datasets until `/access` resolves one. */
  url: string | null
  isPublic: boolean
  slug?: string
  collectionName?: string | null
  /**
   * Cell and gene counts the API already harvested for this dataset.
   *
   * Present for catalog datasets the backend has successfully read; absent for
   * pasted URLs, which have no catalog row, and for catalog datasets whose
   * harvest has not succeeded. Read it through `countsFor`, never directly —
   * the fallback to the probe belongs in one place.
   */
  counts?: StoreShape
}

export function catalogToEntry(d: CatalogDataset): DatasetEntry {
  return {
    key: d.slug,
    kind: 'catalog',
    name: d.name,
    description: d.description,
    url: d.url,
    isPublic: d.is_public,
    slug: d.slug,
    collectionName: d.collection?.name ?? null,
    counts: d.metadata ? { nObs: d.metadata.n_obs, nVar: d.metadata.n_vars } : undefined,
  }
}

/**
 * The counts to display for a row, from whichever source has them.
 *
 * Catalog datasets carry counts the backend harvested, so they resolve with the
 * catalog fetch — the row sorts and sums immediately instead of waiting on a
 * per-dataset round trip. Pasted URLs have no catalog row, so the liveness
 * probe stays their only source.
 *
 * The probe's `status` is deliberately not consulted: a store we cannot reach
 * right now still has a known size. Reachability and size are separate facts,
 * shown separately.
 */
export function countsFor(entry: DatasetEntry, probe?: ProbeResult): StoreShape | undefined {
  return entry.counts ?? probe?.shape
}

/**
 * A pasted URL has no metadata, so the last path segment stands in for a name.
 * Falls back to the whole URL when there is nothing segment-like to show.
 */
export function localToEntry(url: string): DatasetEntry {
  return {
    key: url,
    kind: 'local',
    name: displayNameForUrl(url),
    description: null,
    url,
    isPublic: true,
  }
}

export function displayNameForUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, '')
  const segment = trimmed.split('/').pop()
  return segment && segment.length > 0 ? segment : url
}

/** Case-insensitive substring match across everything a row displays. */
export function matchesSearch(entry: DatasetEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.name, entry.description, entry.url, entry.slug, entry.collectionName]
    .some((field) => field != null && field.toLowerCase().includes(q))
}
