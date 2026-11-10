import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Collapse, InputNumber, Popover, Segmented, Select, Switch, Typography, message } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'
import { buildConfigFromState, buildConfigUrl, buildDatasetUrl } from '../config/buildConfig'
import { loadDatasets } from '../utils/datasets'
import BrandingHeader from './BrandingHeader'
import ColorBySection from './ColorBySection'
import UserAvatar from './UserAvatar'

export function urlLabel(url: string): string {
  return url.replace(/\/+$/, '').split('/').pop() ?? url
}

const sectionStyle = { padding: '12px 16px', borderBottom: '1px solid #f0f0f0' } as const
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', marginBottom: 8 } as const

function AuthSection() {
  return (
    <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
      <UserAvatar showName />
    </div>
  )
}

function ShareLinkPopover({ datasetUrl }: { datasetUrl: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'dataset' | 'config' | null>(null)

  const handleCopy = (type: 'dataset' | 'config') => {
    let url: string
    if (type === 'dataset') {
      url = buildDatasetUrl(datasetUrl)
    } else {
      const config = buildConfigFromState()
      if (!config) return
      url = buildConfigUrl(config)
      if (url.length > 8000) {
        message.warning('Link copied — URL is very long and may not work in all browsers.')
      }
    }
    navigator.clipboard.writeText(url).catch(() => {
      message.error('Failed to copy link to clipboard')
    })
    setCopied(type)
    setTimeout(() => {
      setCopied(null)
      setOpen(false)
    }, 1000)
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
      <div
        style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        onClick={() => handleCopy('dataset')}
      >
        <Typography.Text style={{ fontSize: 12 }}>
          {copied === 'dataset' ? 'Copied!' : 'Share dataset'}
        </Typography.Text>
      </div>
      <div
        style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        onClick={() => handleCopy('config')}
      >
        <Typography.Text style={{ fontSize: 12 }}>
          {copied === 'config' ? 'Copied!' : 'Share current view'}
        </Typography.Text>
      </div>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <LinkOutlined
        style={{ fontSize: 11, marginLeft: 6, cursor: 'pointer', color: '#999' }}
      />
    </Popover>
  )
}

/**
 * The dataset page's controls: dataset, embedding, colour-by, rendering and
 * account. The desktop left sidebar shows it; on narrow screens it is the
 * Controls tab behind ⚙, where the branding sits in the top bar instead and
 * the dim/hide choice for filtered cells lives here (no selection toolbar).
 */
export function ControlsPanel({ showBranding = true, showDisplayMode = false }: {
  showBranding?: boolean
  showDisplayMode?: boolean
} = {}) {
  const navigate = useNavigate()
  const datasetUrl = useAppStore((s) => s.datasetUrl)
  const showHeader = useAppStore((s) => s.showHeader)
  const showDatasetDropdown = useAppStore((s) => s.showDatasetDropdown)
  const nObs = useAppStore((s) => s.nObs)
  const nVar = useAppStore((s) => s.nVar)
  const obsmKeys = useAppStore((s) => s.obsmKeys)
  const selectedEmbedding = useAppStore((s) => s.selectedEmbedding)
  const setSelectedEmbedding = useAppStore((s) => s.setSelectedEmbedding)

  // Saved URLs, plus the current dataset when it is not one of them — a
  // catalog dataset is listed so the select can show it, but never saved.
  const datasetOptions = useMemo(() => {
    const saved = loadDatasets()
    return datasetUrl && !saved.includes(datasetUrl) ? [datasetUrl, ...saved] : saved
  }, [datasetUrl])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {showBranding && showHeader && <BrandingHeader />}

        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...labelStyle }}>
            <span>
              Dataset
              {datasetUrl && (
                <ShareLinkPopover datasetUrl={datasetUrl} />
              )}
            </span>
            {nObs != null && (
              <Typography.Text type="secondary" style={{ fontSize: 11, fontWeight: 400, textTransform: 'none' }}>
                {nObs.toLocaleString()} cells &middot; {(nVar ?? 0).toLocaleString()} genes
              </Typography.Text>
            )}
          </div>
          {showDatasetDropdown ? (
            <Select
              style={{ width: '100%' }}
              size="small"
              placeholder="Select dataset"
              value={datasetUrl}
              onChange={(url: string) => navigate(`/view?url=${encodeURIComponent(url)}`)}
              options={datasetOptions.map((url) => ({ label: urlLabel(url), value: url }))}
            />
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {datasetUrl ? urlLabel(datasetUrl) : 'No dataset'}
            </Typography.Text>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={labelStyle}>Embedding</div>
          <Select
            style={{ width: '100%' }}
            size="small"
            placeholder="Select embedding"
            value={selectedEmbedding}
            onChange={setSelectedEmbedding}
            options={obsmKeys.map((key) => ({ label: key, value: key }))}
            disabled={obsmKeys.length === 0}
          />
        </div>

        <ColorBySection />
        {showDisplayMode && <DisplayModeSection />}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0' }}>
        <RenderingControls />
        <AuthSection />
      </div>
    </div>
  )
}

function RenderingControls() {
  const pointRadius = useAppStore((s) => s.pointRadius)
  const setPointRadius = useAppStore((s) => s.setPointRadius)
  const opacity = useAppStore((s) => s.opacity)
  const setOpacity = useAppStore((s) => s.setOpacity)
  const antialiasing = useAppStore((s) => s.antialiasing)
  const setAntialiasing = useAppStore((s) => s.setAntialiasing)
  const collisionEnabled = useAppStore((s) => s.collisionEnabled)
  const setCollisionEnabled = useAppStore((s) => s.setCollisionEnabled)
  const collisionRadiusScale = useAppStore((s) => s.collisionRadiusScale)
  const setCollisionRadiusScale = useAppStore((s) => s.setCollisionRadiusScale)

  return (
    <Collapse
      ghost
      size="small"
      items={[{
        key: 'rendering',
        label: <span style={{ fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Rendering</span>,
        children: (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Point radius (px)</Typography.Text>
              <InputNumber min={0.5} max={20} step={0.5} size="small" value={pointRadius} onChange={(v) => v != null && setPointRadius(v)} style={{ width: 70 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Opacity</Typography.Text>
              <InputNumber min={0.01} max={1} step={0.05} size="small" value={opacity} onChange={(v) => v != null && setOpacity(v)} style={{ width: 70 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Antialiasing</Typography.Text>
              <Switch size="small" checked={antialiasing} onChange={setAntialiasing} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Collision detection</Typography.Text>
              <Switch size="small" checked={collisionEnabled} onChange={setCollisionEnabled} />
            </div>

            {collisionEnabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Collision scale</Typography.Text>
                <InputNumber min={0.5} max={10} step={0.5} size="small" value={collisionRadiusScale} onChange={(v) => v != null && setCollisionRadiusScale(v)} style={{ width: 70 }} />
              </div>
            )}
          </>
        ),
      }]}
    />
  )
}

function DisplayModeSection() {
  const hasFilter = useAppStore((s) => s.selectionGroups.length > 0)
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const setSelectionDisplayMode = useAppStore((s) => s.setSelectionDisplayMode)
  if (!hasFilter) return null
  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>Filtered cells</div>
      <Segmented
        size="small"
        value={selectionDisplayMode}
        onChange={(v) => setSelectionDisplayMode(v as 'dim' | 'hide')}
        options={[{ label: 'Dim', value: 'dim' }, { label: 'Hide', value: 'hide' }]}
      />
    </div>
  )
}
