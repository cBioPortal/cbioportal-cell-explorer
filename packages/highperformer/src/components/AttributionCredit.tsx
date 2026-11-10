import { useState, type CSSProperties } from 'react'
import { Popover } from 'antd'
import { Link, useHref } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { resolveAttribution, type CollectionAttribution } from '../utils/attribution'

const ext = { target: '_blank', rel: 'noreferrer' } as const

const linkStyle: CSSProperties = { color: '#1677ff', textDecoration: 'none' }

const lineStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  bottom: 8,
  zIndex: 2,
  maxWidth: '60%',
  padding: '2px 7px',
  fontSize: 11,
  color: '#555',
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid #e5e5e5',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'baseline',
  gap: '2px',
}

const labelSpan: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
}

const detailsStyles: CSSProperties = {
  flexShrink: 0,
}

const rowLabel: CSSProperties = { color: '#888', display: 'inline-block', width: 56 }

function CollectionLink({ slug }: { slug: string }) {
  const to = `/collections/${slug}`
  const href = useHref(to)
  // Inside an embedding iframe, navigating in place would replace the viewer.
  if (window.self !== window.top) {
    return <a style={linkStyle} href={href} {...ext}>View collection →</a>
  }
  return <Link style={linkStyle} to={to}>View collection →</Link>
}

function Details({ a }: { a: CollectionAttribution }) {
  return (
    <div style={{ maxWidth: 340, fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{a.name}</div>
      {a.publication_citation && (
        <div>
          <span style={rowLabel}>Cite</span>
          {a.publication_url ? <a style={linkStyle} href={a.publication_url} {...ext}>{a.publication_citation} ↗</a> : a.publication_citation}
        </div>
      )}
      {a.license_name && (
        <div>
          <span style={rowLabel}>License</span>
          {a.license_url ? <a style={linkStyle} href={a.license_url} {...ext}>{a.license_name} ↗</a> : a.license_name}
        </div>
      )}
      {a.source_url && (
        <div>
          <span style={rowLabel}>Source</span>
          <a style={linkStyle} href={a.source_url} {...ext}>{a.source_url.replace(/^https?:\/\//, '')}</a>
        </div>
      )}
      <div style={{ marginTop: 4, fontSize: 11 }}>
        <CollectionLink slug={a.slug} />
      </div>
    </div>
  )
}

/** Map-style data credit in the plot corner; renders nothing without attribution. */
export default function AttributionCredit() {
  const catalog = useAppStore((s) => s.catalogDatasets)
  const slug = useAppStore((s) => s.datasetSlug)
  const url = useAppStore((s) => s.datasetUrl)
  const selectionTool = useAppStore((s) => s.selectionTool)
  // Lift the credit above a bottom overlay (the phone chat sheet) so a
  // licence's attribution stays visible. Its own subscription: the plot that
  // renders this component does not re-render.
  const bottomInset = useAppStore((s) => s.plotBottomInset)
  const [open, setOpen] = useState(false)
  const a = resolveAttribution(catalog, { slug, url })
  if (!a) return null

  return (
    <div
      data-testid="attribution-credit"
      // Don't swallow mouseup from a lasso/rectangle drag ending over the credit.
      style={{ ...lineStyle, bottom: 8 + bottomInset, ...(selectionTool !== 'pan' ? { pointerEvents: 'none' } : {}) }}
    >
      <span style={labelSpan}>
        Data:{' '}
        {a.publication_citation ? (
          a.publication_url ? <a style={linkStyle} href={a.publication_url} {...ext}>{a.publication_citation}</a> : a.publication_citation
        ) : (
          <span>{a.name}</span>
        )}
      </span>
      {a.license_name && (
        <span style={detailsStyles}>
          {' · '}
          {a.license_url ? <a style={linkStyle} href={a.license_url} {...ext}>{a.license_name}</a> : a.license_name}
        </span>
      )}
      <span style={detailsStyles}>
        {' · '}
        <Popover
          content={<Details a={a} />}
          trigger="click"
          placement="topRight"
          open={open}
          onOpenChange={setOpen}
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
        >
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="dialog"
            style={{ ...linkStyle, border: 'none', background: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >details</button>
        </Popover>
      </span>
    </div>
  )
}
