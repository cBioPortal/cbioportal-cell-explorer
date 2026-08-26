import type useAppStore from '../store/useAppStore'

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
  }
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
