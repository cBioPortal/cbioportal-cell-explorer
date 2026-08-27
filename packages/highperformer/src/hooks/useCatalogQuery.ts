import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toggleFacetValue, type FacetFilters } from '../utils/facets'

export type CatalogTab = 'annotated' | 'unannotated'

/** Reserved, so a facet may never be keyed `q` or `tab`. */
const SEARCH_PARAM = 'q'
const TAB_PARAM = 'tab'

/**
 * The catalogue's browse state — search text, active tab, facet selections —
 * held in the URL rather than in component state.
 *
 * A filtered view is then shareable and survives a reload, which matters for a
 * tool people cite; back and forward also behave sensibly without extra work.
 *
 * Facet values repeat their key (`?tissue=lymph+node&tissue=ovary`) rather than
 * joining on a delimiter, because values are free text from ingestion and any
 * delimiter could appear inside one.
 */
export default function useCatalogQuery(facetKeys: string[]) {
  const [params, setParams] = useSearchParams()

  // Keys arrive as a fresh array each render, so compare by content — but via
  // JSON, not a delimiter: a backend facet key containing the delimiter would
  // silently split into two keys and its filters would stop applying.
  const keySignature = JSON.stringify(facetKeys)
  const keys = useMemo<string[]>(() => JSON.parse(keySignature), [keySignature])

  const filters = useMemo<FacetFilters>(() => {
    const next: FacetFilters = {}
    for (const key of keys) {
      const values = params.getAll(key)
      if (values.length > 0) next[key] = values
    }
    return next
  }, [params, keys])

  const query = params.get(SEARCH_PARAM) ?? ''
  const tab: CatalogTab = params.get(TAB_PARAM) === 'unannotated' ? 'unannotated' : 'annotated'

  /**
   * Rewrites only the facet keys, leaving `q`, `tab` and anything else alone.
   *
   * `next` receives the filters as they are in the URL at the moment of the
   * write, not the memoised `filters` above — that value can be a render
   * behind, and two quick clicks would drop one.
   */
  const writeFilters = useCallback(
    (next: (current: FacetFilters) => FacetFilters) => {
      setParams(
        (prev) => {
          const current: FacetFilters = {}
          for (const key of keys) {
            const values = prev.getAll(key)
            if (values.length > 0) current[key] = values
          }

          const out = new URLSearchParams(prev)
          for (const key of keys) out.delete(key)
          for (const [key, values] of Object.entries(next(current))) {
            for (const value of values) out.append(key, value)
          }
          return out
        },
        { replace: true },
      )
    },
    [setParams, keys],
  )

  const setOne = useCallback(
    (param: string, value: string, isDefault: boolean) => {
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev)
          if (isDefault) out.delete(param)
          else out.set(param, value)
          return out
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return {
    filters,
    query,
    tab,
    setQuery: useCallback(
      (value: string) => setOne(SEARCH_PARAM, value, value.trim() === ''),
      [setOne],
    ),
    setTab: useCallback(
      (value: CatalogTab) => setOne(TAB_PARAM, value, value === 'annotated'),
      [setOne],
    ),
    toggleValue: useCallback(
      (key: string, value: string) =>
        writeFilters((current) => toggleFacetValue(current, key, value)),
      [writeFilters],
    ),
    clearFacet: useCallback(
      (key: string) =>
        writeFilters((current) => {
          const next = { ...current }
          delete next[key]
          return next
        }),
      [writeFilters],
    ),
    clearAll: useCallback(() => writeFilters(() => ({})), [writeFilters]),
  }
}
