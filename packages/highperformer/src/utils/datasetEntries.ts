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
  collectionSlug?: string | null
  /**
   * Cell and gene counts the API already harvested for this dataset.
   *
   * Present for catalog datasets the backend has successfully read; absent for
   * pasted URLs, which have no catalog row, and for catalog datasets whose
   * harvest has not succeeded. Read it through `countsFor`, never directly —
   * the fallback to the probe belongs in one place.
   */
  counts?: StoreShape
  /**
   * Facet values this dataset declares, keyed by facet.
   *
   * Three states, not interchangeable: `null` means ingestion has not run,
   * `{}` means it ran and found nothing indexable, and a populated object means
   * values were found. `undefined` is a pasted URL, which has no catalog row at
   * all. See `isAnnotated` in `./facets`.
   */
  facets?: Record<string, string[]> | null
  /**
   * The locally saved URL this row also represents, if any.
   *
   * Set on pasted URLs, and on catalogue datasets a pasted URL turned out to
   * point at. Carries the removal target: a merged catalogue row is keyed by
   * slug, but what gets removed from storage is the URL.
   */
  savedUrl?: string
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
    collectionSlug: d.collection?.slug ?? null,
    counts: d.metadata ? { nObs: d.metadata.n_obs, nVar: d.metadata.n_vars } : undefined,
    facets: d.facets,
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
    savedUrl: url,
  }
}

/**
 * `…/store.zarr` and `…/store.zarr/` are the same store — `probeStore` already
 * treats them so. Only the trailing slash is normalised: the rest of a URL is
 * case- and character-sensitive, and guessing further would merge stores that
 * are genuinely distinct.
 */
export function normalizeStoreUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * One row per store.
 *
 * A saved URL frequently points at something already in the catalogue — every
 * one of them did, in the catalogue this was written against. Listed twice, the
 * same store appeared once with its machine filename and once with its curated
 * name, and every total counted it twice.
 *
 * Where they coincide the catalogue row wins, since it carries the name,
 * description, collection and harvested counts, and inherits `savedUrl` so the
 * badge and the remove action survive the merge.
 */
export function mergeSavedUrls(
  savedUrls: string[],
  catalog: DatasetEntry[],
): DatasetEntry[] {
  const byUrl = new Map<string, DatasetEntry>()
  for (const entry of catalog) {
    if (entry.url) byUrl.set(normalizeStoreUrl(entry.url), entry)
  }

  const merged = new Set<string>()
  const standalone: DatasetEntry[] = []
  for (const url of savedUrls) {
    const match = byUrl.get(normalizeStoreUrl(url))
    if (match) {
      merged.add(match.key)
      byUrl.set(normalizeStoreUrl(url), { ...match, savedUrl: url })
    } else {
      standalone.push(localToEntry(url))
    }
  }

  // Saved-but-uncatalogued URLs lead: one you added yourself is the one you
  // came here to open.
  return [
    ...standalone,
    ...catalog.map((entry) => {
      if (!merged.has(entry.key) || !entry.url) return entry
      return byUrl.get(normalizeStoreUrl(entry.url)) ?? entry
    }),
  ]
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
