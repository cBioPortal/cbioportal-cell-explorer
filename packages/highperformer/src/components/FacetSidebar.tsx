import { useMemo, useState } from 'react'
import { Input } from 'antd'
import { labelStyle } from './landingTokens'
import {
  NOT_ANNOTATED,
  countFacetValues,
  sortFacetValues,
  facetCoverage,
  isDiscriminating,
  countActiveFilters,
  type FacetDef,
  type FacetFilters,
  type FacetValueCount,
} from '../utils/facets'
import type { DatasetEntry } from '../utils/datasetEntries'

/** Beyond this many values a facet collapses; beyond SEARCH_AT it also gains a filter box. */
const COLLAPSE_AT = 8
const SEARCH_AT = 15

function ValueRow({
  item,
  label,
  checked,
  onToggle,
}: {
  item: FacetValueCount
  label: string
  checked: boolean
  onToggle: () => void
}) {
  const absent = item.value === NOT_ANNOTATED
  return (
    <label
      className={`ce-facet-value${absent ? ' is-absent' : ''}${item.count === 0 ? ' is-empty' : ''}`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="ce-facet-value-name" title={label}>{label}</span>
      <span className="ce-facet-value-count">{item.count}</span>
    </label>
  )
}

function Facet({
  def,
  entries,
  filters,
  onToggle,
  onClear,
}: {
  def: FacetDef
  entries: DatasetEntry[]
  filters: FacetFilters
  onToggle: (key: string, value: string) => void
  onClear: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')

  const selected = filters[def.key] ?? []
  const counts = useMemo(
    () => countFacetValues(entries, def.key, filters),
    [entries, def.key, filters],
  )

  // A facet where every dataset answers the same offers nothing to choose —
  // unless it is currently filtering, in which case hiding it would remove the
  // only in-place way to undo that.
  if (selected.length === 0 && !isDiscriminating(counts)) return null

  const sorted = sortFacetValues(counts)
  const coverage = facetCoverage(entries, def.key)

  const matching = query
    ? sorted.filter((v) => v.value !== NOT_ANNOTATED
        && v.value.toLowerCase().includes(query.trim().toLowerCase()))
    : sorted

  // A selection must never be hidden behind the collapse, or you can lose track
  // of a filter that is still narrowing the list.
  const isSelected = (v: string) => selected.includes(v)
  const pinned = matching.filter((v) => isSelected(v.value))
  const rest = matching.filter((v) => !isSelected(v.value))
  const visibleRest = expanded || query ? rest : rest.slice(0, Math.max(0, COLLAPSE_AT - pinned.length))
  const hidden = rest.length - visibleRest.length

  return (
    <section className="ce-facet">
      <div className="ce-facet-head">
        <span style={labelStyle}>{def.label}</span>
        {selected.length > 0 ? (
          <button type="button" className="ce-facet-clear" onClick={() => onClear(def.key)}>
            clear
          </button>
        ) : (
          <span className="ce-facet-coverage">
            {coverage} of {entries.length}
          </span>
        )}
      </div>

      {sorted.length > SEARCH_AT && (
        <Input
          size="small"
          allowClear
          className="ce-facet-search"
          placeholder={`Filter ${def.label.toLowerCase()}`}
          aria-label={`Filter ${def.label} values`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {[...pinned, ...visibleRest].map((item) => (
        <ValueRow
          key={item.value}
          item={item}
          label={item.value === NOT_ANNOTATED ? 'not annotated' : item.value}
          checked={isSelected(item.value)}
          onToggle={() => onToggle(def.key, item.value)}
        />
      ))}

      {hidden > 0 && (
        <button type="button" className="ce-facet-more" onClick={() => setExpanded(true)}>
          Show all {rest.length + pinned.length}
        </button>
      )}
      {expanded && !query && (
        <button type="button" className="ce-facet-more" onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      )}

      {matching.length === 0 && (
        <p className="ce-facet-none">No values match “{query.trim()}”.</p>
      )}
    </section>
  )
}

/**
 * Filter controls for the dataset table.
 *
 * Counts are computed against the entries handed in, which are the annotated
 * ones — unannotated datasets have nothing to count. Every facet's own counts
 * ignore its own selection, so picking one value never zeroes its siblings.
 */
export default function FacetSidebar({
  defs,
  entries,
  filters,
  onToggle,
  onClear,
  onClearAll,
}: {
  defs: FacetDef[]
  entries: DatasetEntry[]
  filters: FacetFilters
  onToggle: (key: string, value: string) => void
  onClear: (key: string) => void
  onClearAll: () => void
}) {
  const active = countActiveFilters(filters)
  const ordered = useMemo(() => [...defs].sort((a, b) => a.order - b.order), [defs])

  if (ordered.length === 0) return null

  return (
    <aside className="ce-facets" aria-label="Filters">
      <div className="ce-facets-head">
        <span style={labelStyle}>Filter</span>
        {active > 0 && (
          <button type="button" className="ce-facet-clear" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>
      {ordered.map((def) => (
        <Facet
          key={def.key}
          def={def}
          entries={entries}
          filters={filters}
          onToggle={onToggle}
          onClear={onClear}
        />
      ))}
    </aside>
  )
}
