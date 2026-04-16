import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input, Button, List, Tooltip, Typography, Tabs } from 'antd'
import { ApartmentOutlined, CopyOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import { probeStore } from '../utils/datasetProbe'
import useAppStore from '../store/useAppStore'
import UserAvatar from '../components/UserAvatar'

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

interface ResolvedAccess {
  url: string
  token?: string
}

function CatalogTab() {
  const catalogDatasets = useAppStore((s) => s.catalogDatasets)
  const openCatalogDataset = useAppStore((s) => s.openCatalogDataset)
  const backendInfo = useAppStore((s) => s.backendInfo)
  const user = useAppStore((s) => s.user)
  const navigate = useNavigate()
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult>>(new Map())
  const [resolvedAccess, setResolvedAccess] = useState<Map<string, ResolvedAccess>>(new Map())

  // Resolve access for private datasets, then probe all datasets
  useEffect(() => {
    const controller = new AbortController()

    // Probe public datasets directly
    for (const ds of catalogDatasets) {
      if (ds.url) {
        const url = ds.url
        setProbeResults((prev) => {
          if (prev.has(ds.slug)) return prev
          return new Map(prev).set(ds.slug, { status: 'pending' })
        })
        setResolvedAccess((prev) => new Map(prev).set(ds.slug, { url }))

        probeStore(url, controller.signal)
          .then((result) => {
            if (controller.signal.aborted) return
            setProbeResults((prev) => new Map(prev).set(ds.slug, result.ok
              ? { status: 'ok', version: result.version }
              : { status: 'error' },
            ))
          })
          .catch(() => {
            if (controller.signal.aborted) return
            setProbeResults((prev) => new Map(prev).set(ds.slug, { status: 'error' }))
          })
      }
    }

    // Resolve private datasets via /access, then probe with token
    const resolvePrivate = async () => {
      const { api } = await import('../api')
      for (const ds of catalogDatasets) {
        if (ds.url || controller.signal.aborted) continue

        setProbeResults((prev) => new Map(prev).set(ds.slug, { status: 'pending' }))

        try {
          const { data } = await api.POST('/api/datasets/{slug}/access', {
            params: { path: { slug: ds.slug } },
          })
          if (controller.signal.aborted || !data) continue

          const access: ResolvedAccess = { url: data.url }
          if (data.credential_type === 'bearer_token' && data.token) {
            access.token = data.token
          }
          setResolvedAccess((prev) => new Map(prev).set(ds.slug, access))

          // Probe with auth headers if needed
          const headers: Record<string, string> = {}
          if (access.token) {
            headers['Authorization'] = `Bearer ${access.token}`
          }

          try {
            const result = await probeStore(data.url, controller.signal, Object.keys(headers).length > 0 ? headers : undefined)
            if (controller.signal.aborted) continue
            setProbeResults((prev) => new Map(prev).set(ds.slug, result.ok
              ? { status: 'ok', version: result.version }
              : { status: 'error' },
            ))
          } catch {
            if (!controller.signal.aborted) {
              setProbeResults((prev) => new Map(prev).set(ds.slug, { status: 'error' }))
            }
          }
        } catch {
          if (!controller.signal.aborted) {
            setProbeResults((prev) => new Map(prev).set(ds.slug, { status: 'error' }))
          }
        }
      }
    }

    resolvePrivate()
    return () => controller.abort()
  }, [catalogDatasets])

  const handleOpen = (slug: string) => {
    navigate(`/view?dataset=${encodeURIComponent(slug)}`)
  }

  return (
    <div>
      {catalogDatasets.length > 0 ? (
        <List
          bordered
          dataSource={catalogDatasets}
          renderItem={(item) => {
            const probe = probeResults.get(item.slug)
            const access = resolvedAccess.get(item.slug)
            const displayUrl = item.url ?? access?.url
            return (
              <List.Item
                style={{ cursor: 'pointer' }}
                onClick={() => handleOpen(item.slug)}
                actions={displayUrl ? [
                  ...(ENABLE_ZARR_VIEW ? [
                    <Tooltip key="inspect" title="Inspect Zarr structure">
                      <Link to={`/zarr_view?url=${encodeURIComponent(displayUrl)}`} onClick={(e) => e.stopPropagation()}>
                        <Button type="text" icon={<ApartmentOutlined />} />
                      </Link>
                    </Tooltip>,
                  ] : []),
                  <Tooltip key="copy" title="Copy zarr URL">
                    <Button
                      type="text"
                      icon={<LinkOutlined />}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(displayUrl) }}
                    />
                  </Tooltip>,
                ] : []}
              >
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{item.name}</Typography.Text>
                  {item.description && (
                    <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Typography.Text></div>
                  )}
                  {displayUrl && (
                    <div><Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{displayUrl}</Typography.Text></div>
                  )}
                  <StatusLine probe={probe} isPublic={item.is_public} />
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
  const [activeTab, setActiveTab] = useState('catalog')

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
