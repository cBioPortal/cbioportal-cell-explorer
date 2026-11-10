import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LeftOutlined, SettingOutlined } from '@ant-design/icons'
import useAppStore from '../../store/useAppStore'
import { useBrand } from '../../hooks/useBrand'
import { ChatSheet } from './ChatSheet'
import { ColorByChip } from './ColorByChip'
import { FilterChip } from './FilterChip'
import { SettingsPanel } from './SettingsPanel'
import { TOP_BAR_HEIGHT } from './sheetSnap'

const iconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e2e9f0',
  borderRadius: 8,
  background: '#fff',
  color: '#5c7186',
  cursor: 'pointer',
}

interface NarrowViewLayoutProps {
  plot: React.ReactNode
  title: string
  chatAvailable: boolean
  slug: string | null
  resumeThreadId: string | null
  onActiveThreadChange: (threadId: string | null) => void
}

/**
 * The dataset page on phones and narrow windows: a slim top bar, the plot
 * filling the rest of the screen, and chat in a sheet over its bottom edge.
 * Controls and the summary sit behind ⚙.
 */
export function NarrowViewLayout({ plot, title, chatAvailable, slug, resumeThreadId, onActiveThreadChange }: NarrowViewLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const showHeader = useAppStore((s) => s.showHeader)
  const brand = useBrand()
  // Inside a cBioPortal iframe there is no Cell Explorer home to go back to.
  const embedded = window.self !== window.top
  const logo = showHeader && !brand.isDefault ? brand.logoOnLight : null

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ height: TOP_BAR_HEIGHT, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', borderBottom: '1px solid #e2e9f0' }}>
        {!embedded && (
          <Link to="/" aria-label="Back to datasets" style={iconButton}>
            <LeftOutlined />
          </Link>
        )}
        {logo && <img src={logo} alt={brand.logoAlt} style={{ height: 24, flex: 'none' }} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <button type="button" aria-label="Settings" onClick={() => setSettingsOpen(true)} style={iconButton}>
          <SettingOutlined />
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {plot}
        <ColorByChip />
        <FilterChip />
        <ChatSheet
          chatAvailable={chatAvailable}
          slug={slug}
          resumeThreadId={resumeThreadId}
          onActiveThreadChange={onActiveThreadChange}
        />
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} chatAvailable={chatAvailable} />
    </div>
  )
}
