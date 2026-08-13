import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, List, Tooltip, Typography } from 'antd'
import { ApartmentOutlined, LinkOutlined } from '@ant-design/icons'
import { probeStore } from '../utils/datasetProbe'
import useAppStore from '../store/useAppStore'

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

type CatalogDataset = ReturnType<typeof useAppStore.getState>['catalogDatasets'][number]

export default function DatasetList({
  datasets,
  emptyText,
}: {
  datasets: CatalogDataset[]
  emptyText?: React.ReactNode
}) {
  const navigate = useNavigate()
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult>>(new Map())
  const [resolvedAccess, setResolvedAccess] = useState<Map<string, ResolvedAccess>>(new Map())

  // Resolve access for private datasets, then probe all datasets
  useEffect(() => {
    const controller = new AbortController()

    // Probe public datasets directly
    for (const ds of datasets) {
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
      for (const ds of datasets) {
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
  }, [datasets])

  const handleOpen = (slug: string) => {
    navigate(`/view?dataset=${encodeURIComponent(slug)}`)
  }

  return (
    <div>
      {datasets.length > 0 ? (
        <List
          bordered
          dataSource={datasets}
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
        <Typography.Text type="secondary">{emptyText}</Typography.Text>
      )}
    </div>
  )
}
