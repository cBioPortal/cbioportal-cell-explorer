import { Link, useNavigate } from 'react-router-dom'
import { Button, ConfigProvider, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ApartmentOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons'
import StatusLine from './StatusLine'
import { t, labelStyle } from './landingTokens'
import { formatCount } from '../utils/formatCount'
import { compareByName, compareByCollection, makeShapeComparator } from '../utils/sortEntries'
import type { ProbeResult, ResolvedAccess } from '../hooks/useDatasetProbes'
import { countsFor, type DatasetEntry } from '../utils/datasetEntries'

const ENABLE_ZARR_VIEW = import.meta.env.VITE_ENABLE_ZARR_VIEW === 'true'

/** Beyond this the table paginates rather than growing without end. */
const PAGE_SIZE = 25

/**
 * antd's defaults — filled header, its own borders and type scale — would pull
 * this page toward a generic admin panel. Scoped to this table rather than set
 * globally in `main.tsx`, so a Table added elsewhere later is not silently
 * restyled to match the landing page.
 */
const TABLE_THEME = {
  components: {
    Table: {
      headerBg: 'transparent',
      headerColor: t.textMuted,
      headerSplitColor: 'transparent',
      headerBorderRadius: 0,
      borderColor: t.line,
      rowHoverBg: t.mist,
      // antd tints the whole sorted column, cutting a grey stripe down the
      // table. The active caret already says which column is sorted.
      bodySortBg: 'transparent',
      headerSortBg: t.mist,
      headerSortHoverBg: t.mist,
      cellPaddingBlock: 16,
      cellPaddingInline: 12,
      footerBg: 'transparent',
      fontFamily: t.sans,
    },
  },
}

export default function DatasetTable({
  entries,
  probes,
  resolved,
  emptyText,
  onRemove,
  showCollection = true,
}: {
  entries: DatasetEntry[]
  probes: Map<string, ProbeResult>
  resolved: Map<string, ResolvedAccess>
  emptyText?: React.ReactNode
  /** Supplied only where rows are removable — i.e. locally added URLs. */
  onRemove?: (entry: DatasetEntry) => void
  /** Off where every row shares one collection, which makes the column noise. */
  showCollection?: boolean
}) {
  const navigate = useNavigate()

  const open = (entry: DatasetEntry) => {
    if (entry.kind === 'local' && entry.url) {
      navigate(`/view?url=${encodeURIComponent(entry.url)}`)
    } else if (entry.slug) {
      navigate(`/view?dataset=${encodeURIComponent(entry.slug)}`)
    }
  }

  const allColumns: ColumnsType<DatasetEntry> = [
    {
      title: 'Dataset',
      key: 'name',
      sorter: compareByName,
      // No width: with `scroll.x` antd uses table-layout:fixed, so the one
      // column left unsized absorbs whatever the others do not take.
      render: (_, entry) => {
        const displayUrl = entry.url ?? resolved.get(entry.key)?.url
        return (
          <>
            <div className="ce-row-title">
              <span className="ce-row-name">{entry.name}</span>
              {entry.savedUrl && (
                <span className="ce-tag ce-tag-local" style={labelStyle}>Local</span>
              )}
            </div>
            {entry.description ? (
              <div className="ce-row-desc">{entry.description}</div>
            ) : (
              displayUrl && <div className="ce-row-url" title={displayUrl}>{displayUrl}</div>
            )}
          </>
        )
      },
    },
    {
      title: 'Collection',
      key: 'collection',
      className: 'ce-col-collection',
      width: 190,
      sorter: compareByCollection,
      render: (_, entry) =>
        entry.collectionSlug && entry.collectionName ? (
          // The only route to the collection page since the chips row went.
          <Link
            to={`/collections/${encodeURIComponent(entry.collectionSlug)}`}
            title={entry.collectionName}
            onClick={(e) => e.stopPropagation()}
          >
            {entry.collectionName}
          </Link>
        ) : (
          <span className="ce-dash">—</span>
        ),
    },
    {
      title: 'Cells',
      key: 'cells',
      align: 'right',
      width: 96,
      sorter: makeShapeComparator(probes, 'nObs'),
      // antd opens ascending by default; the question being asked of a size
      // column is "which is the big atlas?", so open on the largest.
      sortDirections: ['descend', 'ascend'],
      render: (_, entry) => {
        const n = countsFor(entry, probes.get(entry.key))?.nObs
        return n != null
          ? <span className="ce-col-metric">{formatCount(n)}</span>
          : <span className="ce-dash">—</span>
      },
    },
    {
      title: 'Genes',
      key: 'genes',
      align: 'right',
      width: 96,
      sorter: makeShapeComparator(probes, 'nVar'),
      sortDirections: ['descend', 'ascend'],
      render: (_, entry) => {
        const n = countsFor(entry, probes.get(entry.key))?.nVar
        return n != null
          ? <span className="ce-col-metric">{formatCount(n)}</span>
          : <span className="ce-dash">—</span>
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 170,
      render: (_, entry) => (
        <StatusLine probe={probes.get(entry.key)} isPublic={entry.isPublic} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      render: (_, entry) => {
        const displayUrl = entry.url ?? resolved.get(entry.key)?.url
        return (
          <div
            className="ce-row-actions"
            onClick={(e) => e.stopPropagation()}
            // The row handles Enter/Space to open the dataset. Without this,
            // Space on the copy button opens the dataset instead of copying,
            // and Enter does both.
            onKeyDown={(e) => e.stopPropagation()}
          >
            {ENABLE_ZARR_VIEW && displayUrl && (
              <Tooltip title="Inspect Zarr structure">
                <Link to={`/zarr_view?url=${encodeURIComponent(displayUrl)}`}>
                  <Button type="text" size="small" icon={<ApartmentOutlined />} />
                </Link>
              </Tooltip>
            )}
            {displayUrl && (
              <Tooltip title="Copy Zarr URL">
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  aria-label="Copy Zarr URL"
                  onClick={() => navigator.clipboard.writeText(displayUrl)}
                />
              </Tooltip>
            )}
            {onRemove && entry.savedUrl && (
              <Tooltip title="Remove URL">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => onRemove(entry)}
                />
              </Tooltip>
            )}
          </div>
        )
      },
    },
  ]

  const columns = showCollection
    ? allColumns
    : allColumns.filter((c) => c.key !== 'collection')

  if (entries.length === 0) {
    return <div className="ce-empty">{emptyText}</div>
  }

  return (
    <ConfigProvider theme={TABLE_THEME}>
      <Table<DatasetEntry>
        className="ce-table"
        columns={columns}
        dataSource={entries}
        rowKey="key"
        size="middle"
        showSorterTooltip={false}
        // Auto layout lets a long collection name widen its column and squeeze
        // dataset names onto a third line. Fixed makes the declared widths hold
        // and lets the ellipsis apply; the unsized Dataset column takes the rest.
        tableLayout="fixed"
        scroll={{ x: 900 }}
        pagination={
          entries.length > PAGE_SIZE
            ? { pageSize: PAGE_SIZE, showSizeChanger: false, hideOnSinglePage: true }
            : false
        }
        onRow={(entry) => ({
          onClick: () => open(entry),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open(entry)
            }
          },
          tabIndex: 0,
          className: 'ce-tr',
        })}
      />
    </ConfigProvider>
  )
}
