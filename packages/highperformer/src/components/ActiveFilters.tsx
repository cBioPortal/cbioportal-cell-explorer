import { NOT_ANNOTATED, countActiveFilters, type FacetDef, type FacetFilters } from '../utils/facets'

/**
 * What is currently narrowing the list, stated beside the results.
 *
 * The sidebar was supposed to make this redundant — the selections are right
 * there as ticked boxes. In practice two ticks among thirty identical unticked
 * ones do not read as state, the results header says only "21 datasets" with no
 * hint that it is filtered, and scrolling takes the ticks off screen entirely.
 *
 * So the filters are restated where their effect is visible, each removable
 * without hunting for the facet that set it.
 */
export default function ActiveFilters({
  defs,
  filters,
  onToggle,
  onClearAll,
}: {
  defs: FacetDef[]
  filters: FacetFilters
  onToggle: (key: string, value: string) => void
  onClearAll: () => void
}) {
  if (countActiveFilters(filters) === 0) return null

  const labelFor = (key: string) => defs.find((d) => d.key === key)?.label ?? key

  return (
    <div className="ce-active" role="region" aria-label="Active filters">
      {Object.entries(filters).flatMap(([key, values]) =>
        values.map((value) => (
          <button
            key={`${key}:${value}`}
            type="button"
            className="ce-active-chip"
            onClick={() => onToggle(key, value)}
            aria-label={`Remove filter ${labelFor(key)}: ${value}`}
          >
            <span className="ce-active-key">{labelFor(key)}</span>
            <span className="ce-active-value">
              {value === NOT_ANNOTATED ? 'not annotated' : value}
            </span>
            <span aria-hidden="true" className="ce-active-x">×</span>
          </button>
        )),
      )}
      <button type="button" className="ce-active-clear" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}
