import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Pagination } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import StatusLine from './StatusLine'
import { labelStyle } from './landingTokens'
import { formatCount } from '../utils/formatCount'
import { compareByName, compareByCollection, makeShapeComparator } from '../utils/sortEntries'
import type { ProbeResult } from '../hooks/useDatasetProbes'
import { countsFor, type DatasetEntry } from '../utils/datasetEntries'

/** Same page length as the table. */
const PAGE_SIZE = 25

type SortKey = 'default' | 'name' | 'collection' | 'cells' | 'genes'

const SORT_LABELS: Record<SortKey, string> = {
  default: 'Default',
  name: 'Name',
  collection: 'Collection',
  cells: 'Most cells',
  genes: 'Most genes',
}

export function datasetHref(entry: DatasetEntry): string | undefined {
  if (entry.kind === 'local' && entry.url) return `/view?url=${encodeURIComponent(entry.url)}`
  if (entry.slug) return `/view?dataset=${encodeURIComponent(entry.slug)}`
  return undefined
}

/**
 * The dataset list on phones: one card per dataset, the table's columns folded
 * into lines under the name, and a sort menu standing in for the column
 * headers. A 900px table on a phone hides everything but the name behind a
 * sideways scroll.
 */
export default function DatasetCards({
  entries,
  probes,
  emptyText,
  onRemove,
  showCollection,
}: {
  entries: DatasetEntry[]
  probes: Map<string, ProbeResult>
  emptyText?: React.ReactNode
  onRemove?: (entry: DatasetEntry) => void
  showCollection: boolean
}) {
  const [sort, setSort] = useState<SortKey>('default')
  const [page, setPage] = useState(1)
  const top = useRef<HTMLDivElement>(null)

  // Same comparators as the table's columns. Size sorts open on the largest;
  // the 'descend' argument keeps unknown counts at the bottom, as there.
  const sorted = useMemo(() => {
    if (sort === 'default') return entries
    const byCells = makeShapeComparator(probes, 'nObs')
    const byGenes = makeShapeComparator(probes, 'nVar')
    const compare: Record<Exclude<SortKey, 'default'>, (a: DatasetEntry, b: DatasetEntry) => number> = {
      name: compareByName,
      collection: (a, b) => compareByCollection(a, b, 'ascend'),
      cells: (a, b) => -byCells(a, b, 'descend'),
      genes: (a, b) => -byGenes(a, b, 'descend'),
    }
    return [...entries].sort(compare[sort])
  }, [entries, probes, sort])

  // A new filter or sort starts from the top, not a page that may not exist.
  const [seen, setSeen] = useState({ entries, sort })
  if (seen.entries !== entries || seen.sort !== sort) {
    setSeen({ entries, sort })
    setPage(1)
  }

  if (entries.length === 0) {
    return <div className="ce-empty">{emptyText}</div>
  }

  const options = (Object.keys(SORT_LABELS) as SortKey[]).filter(
    (k) => showCollection || k !== 'collection',
  )
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="ce-cards" ref={top}>
      <div className="ce-cards-head">
        <span style={labelStyle}>
          {entries.length} {entries.length === 1 ? 'dataset' : 'datasets'}
        </span>
        <label className="ce-sort">
          <span aria-hidden="true">Sort:</span>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {options.map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
        </label>
      </div>

      {visible.map((entry) => {
        const counts = countsFor(entry, probes.get(entry.key))
        const href = datasetHref(entry)
        return (
          <article key={entry.key} className="ce-card">
            <div className="ce-card-top">
              <h3 className="ce-card-name">
                {href ? <Link to={href}>{entry.name}</Link> : entry.name}
              </h3>
              {onRemove && entry.kind === 'local' && (
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => onRemove(entry)}
                />
              )}
            </div>
            {entry.description && <p className="ce-card-desc">{entry.description}</p>}
            {showCollection && entry.collectionSlug && entry.collectionName && (
              <Link
                className="ce-card-collection"
                to={`/collections/${encodeURIComponent(entry.collectionSlug)}`}
              >
                {entry.collectionName}
              </Link>
            )}
            <div className="ce-card-meta">
              {counts && (
                <>
                  <span>{formatCount(counts.nObs)} cells</span>
                  <span className="ce-card-sep" aria-hidden="true">·</span>
                </>
              )}
              {counts?.nVar != null && (
                <>
                  <span>{formatCount(counts.nVar)} genes</span>
                  <span className="ce-card-sep" aria-hidden="true">·</span>
                </>
              )}
              <StatusLine probe={probes.get(entry.key)} isPublic={entry.isPublic} />
            </div>
          </article>
        )
      })}

      {entries.length > PAGE_SIZE && (
        <Pagination
          className="ce-cards-pager"
          simple
          current={page}
          pageSize={PAGE_SIZE}
          total={entries.length}
          onChange={(p) => {
            setPage(p)
            top.current?.scrollIntoView?.({ block: 'start' })
          }}
        />
      )}
    </div>
  )
}
