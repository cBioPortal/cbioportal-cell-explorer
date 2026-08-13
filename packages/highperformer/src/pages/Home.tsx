import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button, List, Tooltip, Typography, Tabs } from 'antd'
import { ApartmentOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import { probeStore } from '../utils/datasetProbe'
import useAppStore from '../store/useAppStore'
import UserAvatar from '../components/UserAvatar'
import DatasetList from '../components/DatasetList'

const ENABLE_ZARR_VIEW = import.meta.env.VITE_ENABLE_ZARR_VIEW === 'true'

interface ProbeResult {
  status: 'pending' | 'ok' | 'error'
  version?: number
}

function StatusLine({ probe, isPublic }: { probe?: ProbeResult; isPublic: boolean }) {
  const accessLabel = isPublic ? 'Public' : 'Private'
  const accessColor = isPublic ? '#52c41a' : '#faad14'

  let reachLabel: string
  let reachColor: string
  if (!probe) {
    reachLabel = isPublic ? '' : 'Requires authentication'
    reachColor = '#999'
  } else if (probe.status === 'pending') {
    reachLabel = 'Checking...'
    reachColor = '#999'
  } else if (probe.status === 'ok') {
    reachLabel = probe.version ? `Reachable (v${probe.version})` : 'Reachable'
    reachColor = '#52c41a'
  } else {
    reachLabel = 'Unreachable'
    reachColor = '#ff4d4f'
  }

  return (
    <div style={{ fontSize: 11, marginTop: 4 }}>
      <span style={{ color: accessColor }}>● {accessLabel}</span>
      {reachLabel && (
        <>
          <span style={{ color: '#ccc', margin: '0 6px' }}>·</span>
          <span style={{ color: reachColor }}>{reachLabel}</span>
        </>
      )}
    </div>
  )
}

export function CollectionsTab() {
  const collections = useAppStore((s) => s.collections)
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const fetchCollections = useAppStore((s) => s.fetchCollections)

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const ungrouped = catalogDatasets.filter((d) => !d.collection)

  return (
    <div>
      {collections.length > 0 ? (
        <List
          bordered
          dataSource={collections}
          renderItem={(item) => (
            <List.Item>
              <div style={{ flex: 1 }}>
                <Link to={`/collections/${encodeURIComponent(item.slug)}`}>
                  <Typography.Text strong>{item.name}</Typography.Text>
                </Link>
                {item.description && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.description}
                    </Typography.Text>
                  </div>
                )}
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <Typography.Text type="secondary">
                    {item.dataset_count} dataset{item.dataset_count === 1 ? '' : 's'}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <Typography.Text type="secondary">No collections available</Typography.Text>
      )}

      {ungrouped.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>Ungrouped</Typography.Title>
          <DatasetList datasets={ungrouped} />
        </div>
      )}
    </div>
  )
}

function CatalogTab() {
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const backendInfo = useAppStore((s) => s.backendInfo)
  const user = useAppStore((s) => s.user)

  return (
    <DatasetList
      datasets={catalogDatasets}
      emptyText={
        !user && backendInfo?.auth_enabled
          ? 'Sign in to see more datasets'
          : 'No datasets available'
      }
    />
  )
}

function MyUrlsTab() {
  const [url, setUrl] = useState('')
  const [datasets, setDatasets] = useState<string[]>(loadDatasets)
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult>>(new Map())

  useEffect(() => {
    saveDatasets(datasets)
  }, [datasets])

  useEffect(() => {
    const controller = new AbortController()

    for (const ds of datasets) {
      setProbeResults((prev) => {
        if (prev.has(ds)) return prev
        const next = new Map(prev)
        next.set(ds, { status: 'pending' })
        return next
      })

      probeStore(ds, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setProbeResults((prev) => new Map(prev).set(ds, result.ok
            ? { status: 'ok', version: result.version }
            : { status: 'error' },
          ))
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setProbeResults((prev) => new Map(prev).set(ds, { status: 'error' }))
        })
    }

    setProbeResults((prev) => {
      const dsSet = new Set(datasets)
      let changed = false
      const next = new Map(prev)
      for (const key of next.keys()) {
        if (!dsSet.has(key)) { next.delete(key); changed = true }
      }
      return changed ? next : prev
    })

    return () => controller.abort()
  }, [datasets])

  const handleAdd = () => {
    const urls = url.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
    const unique = urls.filter((u) => !datasets.includes(u))
    if (unique.length > 0) {
      setDatasets((prev) => [...unique, ...prev])
    }
    setUrl('')
  }

  const handleRemove = (target: string) => {
    setDatasets((prev) => prev.filter((d) => d !== target))
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input.TextArea
          placeholder="Paste one or more .zarr URLs (one per line or comma-separated)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleAdd() } }}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1 }}
        />
        <Button type="primary" onClick={handleAdd} style={{ alignSelf: 'flex-end' }}>
          Add
        </Button>
      </div>

      {datasets.length > 0 ? (
        <List
          bordered
          dataSource={datasets}
          renderItem={(item) => {
            const result = probeResults.get(item) ?? { status: 'pending' as const }
            return (
              <List.Item
                actions={[
                  ...(ENABLE_ZARR_VIEW ? [
                    <Tooltip key="inspect" title="Inspect Zarr structure">
                      <Link to={`/zarr_view?url=${encodeURIComponent(item)}`}>
                        <Button type="text" icon={<ApartmentOutlined />} />
                      </Link>
                    </Tooltip>,
                  ] : []),
                  <Tooltip key="copy" title="Copy zarr URL">
                    <Button
                      type="text"
                      icon={<LinkOutlined />}
                      onClick={() => navigator.clipboard.writeText(item)}
                    />
                  </Tooltip>,
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemove(item)}
                  />,
                ]}
              >
                <div style={{ flex: 1 }}>
                  <Link to={`/view?url=${encodeURIComponent(item)}`}>
                    <Typography.Text>{item}</Typography.Text>
                  </Link>
                  <StatusLine probe={result} isPublic={true} />
                </div>
              </List.Item>
            )
          }}
        />
      ) : (
        <Typography.Text type="secondary">No URLs added yet</Typography.Text>
      )}
    </div>
  )
}

function Home() {
  const backendInfo = useAppStore((s) => s.backendInfo)
  const backendProbed = useAppStore((s) => s.backendProbed)
  const [activeTab, setActiveTab] = useState('collections')

  if (!backendProbed) {
    return (
      <div style={{ maxWidth: 960 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Datasets</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Datasets</h2>
        <UserAvatar />
      </div>

      {backendInfo ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'collections', label: 'Collections', children: <CollectionsTab /> },
            { key: 'catalog', label: 'All datasets', children: <CatalogTab /> },
            { key: 'urls', label: 'My URLs', children: <MyUrlsTab /> },
          ]}
        />
      ) : (
        <MyUrlsTab />
      )}
    </div>
  )
}

export default Home
