import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { SearchOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import useAppStore from '../store/useAppStore'
import SiteHeader from '../components/SiteHeader'
import DatasetTable from '../components/DatasetTable'
import { labelStyle } from '../components/landingTokens'
import type { Stat } from '../components/OverviewStats'
import useDatasetProbes from '../hooks/useDatasetProbes'
import { MOCK_CATALOG_ENABLED } from '../utils/mockCatalog'
import { formatCount } from '../utils/formatCount'
import {
  catalogToEntry,
  countsFor,
  localToEntry,
  matchesSearch,
  type DatasetEntry,
} from '../utils/datasetEntries'

/**
 * Mono eyebrow labelling a section. The hairline is suppressed above the table,
 * whose own header row already draws one.
 */
function SectionLabel({ children, rule = true }: { children: React.ReactNode; rule?: boolean }) {
  return (
    <div className="ce-section-label">
      <span style={labelStyle}>{children}</span>
      {rule && <span className="ce-rule" />}
    </div>
  )
}

function CollectionChips() {
  const collections = useAppStore((s) => s.collections)
  const fetchCollections = useAppStore((s) => s.fetchCollections)

  useEffect(() => {
    // The dev fixture already seeded collections; fetching would overwrite them
    // with whatever a locally running backend happens to serve.
    if (MOCK_CATALOG_ENABLED) return
    fetchCollections()
  }, [fetchCollections])

  if (collections.length === 0) return null

  return (
    <section className="ce-section">
      <SectionLabel>Collections</SectionLabel>
      <div className="ce-chips">
        {collections.map((c) => (
          <Link
            key={c.slug}
            to={`/collections/${encodeURIComponent(c.slug)}`}
            className="ce-chip"
            title={c.description ?? undefined}
          >
            <span className="ce-chip-name">{c.name}</span>
            <span className="ce-chip-count" style={labelStyle}>{c.dataset_count}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function AddUrlPanel({ onAdd }: { onAdd: (urls: string[]) => void }) {
  const [value, setValue] = useState('')
  const ref = useRef<TextAreaRef>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const submit = () => {
    const urls = value.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
    if (urls.length > 0) onAdd(urls)
    setValue('')
  }

  return (
    <div className="ce-addurl">
      <Input.TextArea
        ref={ref}
        placeholder="https://example.org/atlas.zarr — one per line to add several"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        autoSize={{ minRows: 2, maxRows: 5 }}
      />
      <Button type="primary" onClick={submit} disabled={value.trim().length === 0}>
        Add URL
      </Button>
    </div>
  )
}

function Home() {
  const backendInfo = useAppStore((s) => s.backendInfo)
  const backendProbed = useAppStore((s) => s.backendProbed)
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const collectionCount = useAppStore((s) => s.collections.length)
  const user = useAppStore((s) => s.user)

  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [localUrls, setLocalUrls] = useState<string[]>(loadDatasets)

  useEffect(() => {
    saveDatasets(localUrls)
  }, [localUrls])

  const addUrls = (urls: string[]) => {
    setLocalUrls((prev) => [...urls.filter((u) => !prev.includes(u)), ...prev])
    setAddOpen(false)
  }

  const removeEntry = (entry: DatasetEntry) => {
    setLocalUrls((prev) => prev.filter((u) => u !== entry.key))
  }

  // Catalog and local URLs share one list. Local entries lead, because a URL
  // you just pasted is the one you came here to open.
  const allEntries = useMemo<DatasetEntry[]>(
    () => [...localUrls.map(localToEntry), ...catalogDatasets.map(catalogToEntry)],
    [localUrls, catalogDatasets],
  )

  const entries = useMemo(
    () => allEntries.filter((e) => matchesSearch(e, query)),
    [allEntries, query],
  )

  // Probing is driven by the full set, not the filtered one — the overview
  // figures describe everything available, and typing a search must not cancel
  // and re-issue every request.
  const { probes, resolved } = useDatasetProbes(allEntries)

  // The table's own column filters narrow further than `entries` knows about.
  const [filteredCount, setFilteredCount] = useState<number | null>(null)
  useEffect(() => setFilteredCount(null), [entries])
  const visibleCount = filteredCount ?? entries.length

  const stats = useMemo<Stat[]>(() => {
    let cells = 0
    let counted = 0
    let pending = 0
    for (const entry of allEntries) {
      const probe = probes.get(entry.key)
      const counts = countsFor(entry, probe)
      if (counts) {
        cells += counts.nObs
        counted++
      } else if (!probe || probe.status === 'pending') {
        // Only a row still waiting on a probe can gain a count later. Catalog
        // rows already have theirs, and a resolved probe with no shape never
        // will — neither should make the figure look unfinished.
        pending++
      }
    }
    const figures: Stat[] = [
      { label: 'Datasets', value: String(allEntries.length) },
      {
        label: 'Cells',
        // Catalog counts arrive with the catalog itself, so this is complete on
        // first paint unless pasted URLs are still being probed. The note covers
        // that remainder rather than withholding the figure.
        value: counted > 0 ? formatCount(cells) : '—',
        note: pending > 0 ? `counting ${counted}/${allEntries.length}` : undefined,
      },
    ]
    // Collections only exist when a backend serves them.
    if (backendInfo) figures.push({ label: 'Collections', value: String(collectionCount) })
    return figures
  }, [allEntries, probes, collectionCount, backendInfo])

  // Every empty state names a next step — there is always something to do here.
  let emptyText: React.ReactNode
  if (query.trim()) {
    emptyText = (
      <>
        No datasets match “{query.trim()}”.
        <span className="ce-empty-hint">Try a shorter search, or add a .zarr URL.</span>
      </>
    )
  } else if (!backendInfo) {
    emptyText = 'Add a .zarr URL to open your own dataset.'
  } else if (!user && backendInfo.auth_enabled) {
    emptyText = 'Sign in to see the datasets available to you, or add a .zarr URL.'
  } else {
    emptyText = 'No datasets yet. Add a .zarr URL to open your own.'
  }

  return (
    <div className="ce-landing">
      <SiteHeader stats={stats} />

      <main className="ce-main">
        <div className="ce-search-row">
          <Input
            className="ce-search"
            size="large"
            allowClear
            prefix={<SearchOutlined className="ce-search-icon" />}
            placeholder="Search datasets"
            aria-label="Search datasets"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            size="large"
            className="ce-addurl-toggle"
            icon={addOpen ? <CloseOutlined /> : <PlusOutlined />}
            onClick={() => setAddOpen((o) => !o)}
            aria-expanded={addOpen}
          >
            {addOpen ? 'Cancel' : 'Add URL'}
          </Button>
        </div>

        {addOpen && <AddUrlPanel onAdd={addUrls} />}

        {backendProbed && backendInfo && <CollectionChips />}

        <section className="ce-section">
          <SectionLabel rule={false}>
            {visibleCount} {visibleCount === 1 ? 'dataset' : 'datasets'}
          </SectionLabel>
          <DatasetTable
            entries={entries}
            probes={probes}
            resolved={resolved}
            emptyText={emptyText}
            onRemove={removeEntry}
            onVisibleCountChange={setFilteredCount}
          />
        </section>
      </main>
    </div>
  )
}

export default Home
