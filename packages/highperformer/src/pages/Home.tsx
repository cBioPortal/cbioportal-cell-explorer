import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button, List, Tag, Tooltip, Typography, Tabs } from 'antd'
import { ApartmentOutlined, CheckCircleOutlined, CopyOutlined, DeleteOutlined, ExclamationCircleOutlined, LinkOutlined, LoadingOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import { probeStore } from '../utils/datasetProbe'
import useAppStore from '../store/useAppStore'
import UserAvatar from '../components/UserAvatar'

const ENABLE_ZARR_VIEW = import.meta.env.VITE_ENABLE_ZARR_VIEW === 'true'

interface ProbeResult {
  status: 'pending' | 'ok' | 'error'
  version?: number
}

const StatusIcon = ({ status }: { status: ProbeResult['status'] }) => {
  if (status === 'pending') return <LoadingOutlined style={{ fontSize: 14, color: '#d9d9d9' }} />
  if (status === 'ok') return <CheckCircleOutlined style={{ fontSize: 14, color: '#52c41a' }} />
  return <ExclamationCircleOutlined style={{ fontSize: 14, color: '#ff4d4f' }} />
}

function probeTooltip(result: ProbeResult): string {
  if (result.status === 'pending') return 'Checking...'
  if (result.status === 'error') return 'Unreachable — check CORS, URL, or permissions'
  return `Accessible (Zarr v${result.version})`
}

function CatalogTab() {
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const openCatalogDataset = useAppStore((s) => s.openCatalogDataset)
  const backendInfo = useAppStore((s) => s.backendInfo)
  const user = useAppStore((s) => s.user)
  const navigate = useNavigate()
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult>>(new Map())

  // Probe public datasets for accessibility
  useEffect(() => {
    const controller = new AbortController()
    const publicUrls = catalogDatasets.filter((d) => d.url).map((d) => d.url!)

    for (const url of publicUrls) {
      setProbeResults((prev) => {
        if (prev.has(url)) return prev
        const next = new Map(prev)
        next.set(url, { status: 'pending' })
        return next
      })

      probeStore(url, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          setProbeResults((prev) => new Map(prev).set(url, result.ok
            ? { status: 'ok', version: result.version }
            : { status: 'error' },
          ))
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setProbeResults((prev) => new Map(prev).set(url, { status: 'error' }))
        })
    }

    return () => controller.abort()
  }, [catalogDatasets])

  const handleOpen = async (slug: string) => {
    await openCatalogDataset(slug)
    navigate('/view')
  }

  return (
    <div>
      {catalogDatasets.length > 0 ? (
        <List
          bordered
          dataSource={catalogDatasets}
          renderItem={(item) => {
            const probe = item.url ? probeResults.get(item.url) : undefined
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => handleOpen(item.slug)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  {item.url && probe ? (
                    <Tooltip title={probeTooltip(probe)}>
                      <StatusIcon status={probe.status} />
                    </Tooltip>
                  ) : !item.url ? (
                    <Tooltip title="Sign in to access">
                      <LockOutlined style={{ fontSize: 14, color: '#faad14' }} />
                    </Tooltip>
                  ) : null}
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong>{item.name}</Typography.Text>
                    {item.description && (
                      <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Typography.Text></div>
                    )}
                    {item.url && (
                      <div><Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{item.url}</Typography.Text></div>
                    )}
                  </div>
                  <Tag
                    color={item.is_public ? 'green' : 'orange'}
                    icon={item.is_public ? <GlobalOutlined /> : <LockOutlined />}
                    style={{ fontSize: 11, margin: 0 }}
                  >
                    {item.is_public ? 'public' : 'private'}
                  </Tag>
                  {probe?.status === 'ok' && probe.version && (
                    <Tag color="default" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>v{probe.version}</Tag>
                  )}
                </div>
              </List.Item>
            )
          }}
        />
      ) : (
        <Typography.Text type="secondary">
          {!user && backendInfo?.auth_enabled
            ? 'Sign in to see more datasets'
            : 'No datasets available'}
        </Typography.Text>
      )}
    </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tooltip title={probeTooltip(result)}>
                    <StatusIcon status={result.status} />
                  </Tooltip>
                  <Link to={`/view?url=${encodeURIComponent(item)}`}>
                    <Typography.Text>{item}</Typography.Text>
                  </Link>
                  {result.status === 'ok' && result.version && (
                    <Tag color="default" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>v{result.version}</Tag>
                  )}
                  {result.status === 'error' && (
                    <Tag color="error" style={{ fontSize: 11, lineHeight: '18px', margin: 0 }}>unreachable</Tag>
                  )}
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

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Datasets</h2>
        <UserAvatar />
      </div>

      {backendInfo ? (
        <Tabs
          defaultActiveKey="catalog"
          items={[
            { key: 'catalog', label: 'Catalog', children: <CatalogTab /> },
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
