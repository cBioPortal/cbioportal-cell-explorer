import type { ReactNode } from 'react'
import { useHref, useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { LockOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'
import type { DatasetLoadError } from '../store/datasetLoadError'
import { loginUrl } from '../utils/loginUrl'
import { t } from './landingTokens'
import BrandingHeader from './BrandingHeader'
import UserAvatar from './UserAvatar'

interface DatasetStatusProps {
  error: DatasetLoadError
  onRetry: () => void
}

type Tone = 'neutral' | 'warn'

interface Content {
  icon: ReactNode
  tone: Tone
  title: string
  body: ReactNode
  /** Primary first. */
  actions: ReactNode[]
  footer?: ReactNode
  details?: ReactNode
}

const strong = (text: string) => <strong style={{ color: t.text }}>{text}</strong>

/**
 * What the viewer shows in place of a dataset it could not open. Being signed
 * out or lacking access is not a failure, so those states are neutral and only
 * states where something is actually broken are amber and offer "Try again".
 */
export function DatasetStatus({ error, onRetry }: DatasetStatusProps) {
  const showHeader = useAppStore((s) => s.showHeader)
  const user = useAppStore((s) => s.user)
  const accessContact = useAppStore((s) => s.backendInfo?.access_contact ?? null)
  const homeHref = useHref('/')
  const navigate = useNavigate()
  const embedded = window.self !== window.top

  const browse = embedded ? null : (
    <Button
      key="browse"
      href={homeHref}
      onClick={(e) => {
        e.preventDefault()
        navigate('/')
      }}
    >
      Browse datasets
    </Button>
  )
  const retry = (
    <Button key="retry" type="primary" onClick={onRetry}>
      Try again
    </Button>
  )
  // Signing in inside an iframe rarely works (identity providers refuse to be
  // framed, and the session cookie is third-party there), so an embed sends
  // the viewer to a full tab instead.
  const signIn = embedded ? (
    <Button key="open" type="primary" href={window.location.href} target="_blank" rel="noopener">
      Open in Cell Explorer ↗
    </Button>
  ) : (
    <Button key="signin" type="primary" href={loginUrl()}>
      Sign in
    </Button>
  )

  const content = describe(error)

  function describe(e: DatasetLoadError): Content {
    switch (e.kind) {
      case 'sign_in_required':
        return {
          icon: <LockOutlined />,
          tone: 'neutral',
          title: 'This dataset is private',
          body: <>Sign in to view {strong(e.name ?? e.slug)}. You'll come straight back here afterwards.</>,
          actions: [signIn, browse],
        }
      case 'session_expired':
        return {
          icon: <LockOutlined />,
          tone: 'neutral',
          title: 'Your session has expired',
          body: <>Sign in again to keep viewing {strong(e.name ?? e.slug)}.</>,
          actions: [signIn],
        }
      case 'no_access': {
        const name = e.name ?? e.slug
        const account = user ? (user.email ?? user.name ?? user.sub) : null
        const subject = encodeURIComponent(`Access request: ${name}`)
        const mailto = accessContact ? `mailto:${accessContact}?subject=${subject}` : null
        return {
          icon: <LockOutlined />,
          tone: 'neutral',
          title: "You don't have access to this dataset",
          body: (
            <>
              {account ? <>You're signed in as {strong(account)}, but this account</> : 'Your account'} can't
              view {strong(name)}.{' '}
              {mailto ? (
                <>Email <a href={mailto}>{accessContact}</a> to request access.</>
              ) : (
                'Contact your administrator to request access.'
              )}
            </>
          ),
          actions: mailto
            ? [<Button key="request" type="primary" href={mailto}>Request access</Button>, browse]
            : [browse],
          footer: embedded ? undefined : (
            <>Wrong account? <a href={loginUrl()}>Sign in with a different account</a></>
          ),
        }
      }
      case 'not_found':
        return {
          icon: <SearchOutlined />,
          tone: 'neutral',
          title: 'Dataset not found',
          body: (
            <>
              There's no dataset called {strong(e.slug)}. It may have been renamed or removed, or the link may have a
              typo.
            </>
          ),
          actions: [browse],
        }
      case 'unreachable':
        return {
          icon: <WarningOutlined />,
          tone: 'warn',
          title: "Couldn't reach Cell Explorer",
          body: 'Check your connection and try again. If it keeps happening, the service may be down.',
          actions: [retry],
        }
      case 'unavailable':
        return {
          icon: <WarningOutlined />,
          tone: 'warn',
          title: 'Dataset temporarily unavailable',
          body: "We couldn't get access to this dataset's files right now. Try again in a few minutes.",
          actions: [retry, browse],
        }
      case 'files_failed':
        return {
          icon: <WarningOutlined />,
          tone: 'warn',
          title: "This dataset's files couldn't be loaded",
          body: (
            <>
              Something went wrong reading {strong(e.name ?? e.slug)}. Try again, and if it persists, let the
              administrator know.
            </>
          ),
          actions: [retry, browse],
          details: <code style={codeStyle}>{e.detail}</code>,
        }
      case 'store_failed':
        return {
          icon: <WarningOutlined />,
          tone: 'warn',
          title: "Couldn't open this Zarr store",
          body: 'Check that the URL points to an AnnData Zarr store and that its server allows cross-origin requests.',
          actions: [retry, browse],
          details: (
            <>
              <code style={codeStyle}>{e.url}</code>
              <br />
              <code style={codeStyle}>{e.detail}</code>
            </>
          ),
        }
      case 'config_unreadable':
        return {
          icon: <WarningOutlined />,
          tone: 'warn',
          title: "This link's saved view is invalid",
          body: "The view settings in this link couldn't be read.",
          actions: [browse],
        }
    }
  }

  const actions = content.actions.filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: t.mist, fontFamily: t.sans }}>
      {showHeader && !embedded && (
        <div style={{ display: 'flex', alignItems: 'stretch', background: '#fff' }}>
          <div style={{ flex: 1 }}>
            <BrandingHeader />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
            <UserAvatar showName />
          </div>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div
          role="status"
          style={{
            maxWidth: 440,
            width: '100%',
            padding: 28,
            background: t.paper,
            border: `1px solid ${t.line}`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              marginBottom: 14,
              background: content.tone === 'warn' ? '#fbf1de' : '#e6eef7',
              // Neutral icons follow operator branding (set by applyBrandColors.ts).
              color: content.tone === 'warn' ? t.warn : `var(--brand-ink, ${t.ink})`,
            }}
          >
            {content.icon}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: t.text }}>{content.title}</h1>
          <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.55, color: t.textMuted }}>{content.body}</p>
          {actions.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
          {content.footer && (
            <p style={{ margin: '14px 0 0', fontSize: 12.5, color: t.textFaint }}>{content.footer}</p>
          )}
          {content.details && (
            <details style={{ marginTop: 14, fontSize: 12.5, color: t.textMuted }}>
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              <div style={{ marginTop: 8 }}>{content.details}</div>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

const codeStyle: React.CSSProperties = { fontFamily: t.mono, fontSize: 12, wordBreak: 'break-all' }
