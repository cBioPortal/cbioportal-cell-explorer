import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DatasetTable from '../components/DatasetTable'
import OverviewStats, { type Stat } from '../components/OverviewStats'
import UserAvatar from '../components/UserAvatar'
import { labelStyle } from '../components/landingTokens'
import { catalogToEntry, countsFor } from '../utils/datasetEntries'
import { formatCount } from '../utils/formatCount'
import useDatasetProbes from '../hooks/useDatasetProbes'
import useAppStore from '../store/useAppStore'

type CatalogDataset = ReturnType<typeof useAppStore.getState>['catalogDatasets'][number]

interface CollectionDetail {
  slug: string
  name: string
  description: string | null
  publication_url: string | null
  publication_citation: string | null
  dataset_count: number
  datasets: CatalogDataset[]
}

/**
 * The band, without the landing page's point field. That field is the front
 * door's signature; repeating it on every detail page would spend it.
 */
function DetailBand({ children }: { children: React.ReactNode }) {
  return (
    <header className="ce-header ce-header-slim">
      <div className="ce-header-inner">
        <div className="ce-header-row">
          <div className="ce-detail-main">
            <Link to="/" className="ce-back" style={labelStyle}>
              ← All datasets
            </Link>
            {children}
          </div>
          <div className="ce-header-actions">
            <UserAvatar onDark />
          </div>
        </div>
      </div>
    </header>
  )
}

export default function Collection() {
  const { slug } = useParams<{ slug: string }>()
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    const load = async () => {
      try {
        const { api } = await import('../api')
        const { data } = await api.GET('/api/collections/{slug}', {
          params: { path: { slug } },
        })
        if (cancelled) return
        // The API returns 404 both for an unknown slug and for one whose
        // datasets the caller cannot see. Treat them identically — telling
        // them apart would confirm that a gated collection exists.
        if (data) setCollection(data as CollectionDetail)
        else setNotFound(true)
      } catch {
        if (!cancelled) setNotFound(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Stable identity matters: useDatasetProbes keys off `entries` changing, so a
  // fresh array every render would re-probe forever.
  const entries = useMemo(
    () => (collection?.datasets ?? []).map(catalogToEntry),
    [collection],
  )

  const { probes, resolved } = useDatasetProbes(entries)

  const stats = useMemo<Stat[]>(() => {
    let cells = 0
    let counted = 0
    let pending = 0
    for (const entry of entries) {
      const probe = probes.get(entry.key)
      const counts = countsFor(entry, probe)
      if (counts) {
        cells += counts.nObs
        counted++
      } else if (!probe || probe.status === 'pending') {
        // Only a row still waiting on a probe can gain a count later.
        pending++
      }
    }
    return [
      { label: 'Datasets', value: String(entries.length) },
      {
        label: 'Cells',
        value: counted > 0 ? formatCount(cells) : '—',
        note: pending > 0 ? `counting ${counted}/${entries.length}` : undefined,
      },
    ]
  }, [entries, probes])

  if (notFound) {
    return (
      <div className="ce-landing">
        <DetailBand>
          <h1 className="ce-detail-title">Collection not found</h1>
          <p className="ce-detail-desc">
            It may have been removed, or you may not have access to it.
          </p>
        </DetailBand>
      </div>
    )
  }

  if (!collection) {
    // Render the band alone rather than a blank page, so the layout does not
    // jump once the request lands.
    return (
      <div className="ce-landing">
        <DetailBand>
          <h1 className="ce-detail-title">&nbsp;</h1>
        </DetailBand>
      </div>
    )
  }

  return (
    <div className="ce-landing">
      <DetailBand>
        <h1 className="ce-detail-title">{collection.name}</h1>
        {collection.description && (
          <p className="ce-detail-desc">{collection.description}</p>
        )}
        {collection.publication_url && (
          <a
            className="ce-citation"
            href={collection.publication_url}
            target="_blank"
            rel="noreferrer"
          >
            {collection.publication_citation ?? collection.publication_url}
            <span aria-hidden="true"> ↗</span>
          </a>
        )}
        <OverviewStats stats={stats} />
      </DetailBand>

      <main className="ce-main">
        <DatasetTable
          entries={entries}
          probes={probes}
          resolved={resolved}
          emptyText="No datasets in this collection yet."
          showCollection={false}
        />
      </main>
    </div>
  )
}
