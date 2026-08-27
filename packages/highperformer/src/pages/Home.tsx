import { useState, useEffect, useMemo } from 'react'
import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import useAppStore from '../store/useAppStore'
import SiteHeader from '../components/SiteHeader'
import DatasetTable from '../components/DatasetTable'
import { labelStyle } from '../components/landingTokens'
import type { Stat } from '../components/OverviewStats'
import useDatasetProbes from '../hooks/useDatasetProbes'
import useCatalogQuery from '../hooks/useCatalogQuery'
import FacetSidebar from '../components/FacetSidebar'
import { applyFacetFilters, partitionByAnnotation, countActiveFilters } from '../utils/facets'
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

function Home() {
  const backendInfo = useAppStore((s) => s.backendInfo)
  const backendProbed = useAppStore((s) => s.backendProbed)
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const collectionCount = useAppStore((s) => s.collections.length)
  const facetDefs = useAppStore((s) => s.facetDefs)
  const user = useAppStore((s) => s.user)


  const facetKeys = useMemo(() => facetDefs.map((f) => f.key), [facetDefs])
  const { filters, query: urlQuery, tab, setQuery, setTab, toggleValue, clearFacet, clearAll } =
    useCatalogQuery(facetKeys)

  // The input is driven locally and mirrored to the URL after a pause. Driving
  // it from the URL directly loses keystrokes: each one round-trips through the
  // router, and the next lands before the value comes back.
  const [query, setDraft] = useState(urlQuery)
  useEffect(() => setDraft(urlQuery), [urlQuery])
  useEffect(() => {
    if (query === urlQuery) return
    const timer = setTimeout(() => setQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query, urlQuery, setQuery])
  const [localUrls, setLocalUrls] = useState<string[]>(loadDatasets)

  useEffect(() => {
    saveDatasets(localUrls)
  }, [localUrls])

  const removeEntry = (entry: DatasetEntry) => {
    setLocalUrls((prev) => prev.filter((u) => u !== entry.key))
  }

  // Catalog and local URLs share one list. Local entries lead, because a URL
  // you just pasted is the one you came here to open.
  const allEntries = useMemo<DatasetEntry[]>(
    () => [...localUrls.map(localToEntry), ...catalogDatasets.map(catalogToEntry)],
    [localUrls, catalogDatasets],
  )

  // Split before filtering: facets only apply to datasets that declare values,
  // and the unannotated half must stay reachable however the facets are set.
  const { annotated, unannotated } = useMemo(
    () => partitionByAnnotation(allEntries),
    [allEntries],
  )

  const searched = useMemo(
    () => ({
      annotated: annotated.filter((e) => matchesSearch(e, query)),
      unannotated: unannotated.filter((e) => matchesSearch(e, query)),
    }),
    [annotated, unannotated, query],
  )

  const facetted = useMemo(
    () => applyFacetFilters(searched.annotated, filters),
    [searched.annotated, filters],
  )

  // Tabs only appear when there is a split to represent. With no facets at all
  // — which is every catalogue the backend has not indexed — everything is
  // "unannotated", and a default Annotated tab would render empty.
  const showTabs = annotated.length > 0 && unannotated.length > 0
  const activeTab = showTabs ? tab : annotated.length > 0 ? 'annotated' : 'unannotated'

  // `activeTab` already resolves the no-tabs case to whichever half exists.
  const entries = activeTab === 'annotated' ? facetted : searched.unannotated

  const otherTabMatches = !showTabs
    ? 0
    : activeTab === 'annotated'
      ? searched.unannotated.length
      : searched.annotated.length

  // Probing is driven by the full set, not the filtered one — the overview
  // figures describe everything available, and typing a search must not cancel
  // and re-issue every request.
  const { probes, resolved } = useDatasetProbes(allEntries)

  const visibleCount = entries.length

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
  const activeFilters = countActiveFilters(filters)

  let emptyText: React.ReactNode
  if (activeFilters > 0) {
    emptyText = (
      <>
        No datasets match these filters.
        <span className="ce-empty-hint">
          Clear a filter to widen the search{query.trim() ? ', or try a shorter search' : ''}.
        </span>
      </>
    )
  } else if (query.trim()) {
    emptyText = (
      <>
        No datasets match “{query.trim()}”.
        <span className="ce-empty-hint">Try a shorter or more general search.</span>
      </>
    )
  } else if (!backendInfo) {
    emptyText = 'No datasets available. Connect a backend to browse a catalog.'
  } else if (!user && backendInfo.auth_enabled) {
    emptyText = 'Sign in to see the datasets available to you.'
  } else {
    emptyText = 'No datasets yet.'
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
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>

        {showTabs && (
          <div className="ce-tabs" role="tablist" aria-label="Catalog">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'annotated'}
              className={`ce-tab${activeTab === 'annotated' ? ' is-active' : ''}`}
              onClick={() => setTab('annotated')}
            >
              Annotated <span className="ce-tab-count">{annotated.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'unannotated'}
              className={`ce-tab${activeTab === 'unannotated' ? ' is-active' : ''}`}
              onClick={() => setTab('unannotated')}
            >
              Unannotated <span className="ce-tab-count">{unannotated.length}</span>
            </button>
          </div>
        )}

        <div className="ce-results">
          {activeTab === 'annotated' && facetDefs.length > 0 && annotated.length > 0 && (
            <FacetSidebar
              defs={facetDefs}
              entries={searched.annotated}
              filters={filters}
              onToggle={toggleValue}
              onClear={clearFacet}
              onClearAll={clearAll}
            />
          )}

          <section className="ce-results-main">
          <SectionLabel rule={false}>
            {visibleCount} {visibleCount === 1 ? 'dataset' : 'datasets'}
          </SectionLabel>
          <DatasetTable
            entries={entries}
            probes={probes}
            resolved={resolved}
            emptyText={emptyText}
            onRemove={removeEntry}
          />

          {/* A split catalogue must never make the other half look absent. */}
          {query.trim() && otherTabMatches > 0 && (
            <button
              type="button"
              className="ce-cross-tab"
              onClick={() => setTab(activeTab === 'annotated' ? 'unannotated' : 'annotated')}
            >
              {otherTabMatches} more {otherTabMatches === 1 ? 'match' : 'matches'} in{' '}
              {activeTab === 'annotated' ? 'Unannotated' : 'Annotated'} →
            </button>
          )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default Home
