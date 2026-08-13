import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Typography } from 'antd'
import DatasetList from '../components/DatasetList'
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

  if (notFound) {
    return (
      <div>
        <Link to="/">← Back to datasets</Link>
        <Typography.Paragraph style={{ marginTop: 24 }}>
          Collection not found.
        </Typography.Paragraph>
      </div>
    )
  }

  if (!collection) {
    return <div />
  }

  return (
    <div>
      <Link to="/">← Back to datasets</Link>
      <h2 style={{ marginTop: 16, marginBottom: 8 }}>{collection.name}</h2>
      {collection.description && (
        <Typography.Paragraph type="secondary">{collection.description}</Typography.Paragraph>
      )}
      {collection.publication_url && (
        <Typography.Paragraph>
          <a href={collection.publication_url} target="_blank" rel="noreferrer">
            {collection.publication_citation ?? collection.publication_url}
          </a>
        </Typography.Paragraph>
      )}
      <DatasetList datasets={collection.datasets} emptyText="No datasets available" />
    </div>
  )
}
