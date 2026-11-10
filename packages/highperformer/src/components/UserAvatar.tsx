import { Button, Popover, Typography } from 'antd'
import { LoginOutlined, LogoutOutlined, SwapOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'
import { t } from './landingTokens'
import { loginUrl } from '../utils/loginUrl'
import { signOut, switchAccount } from '../utils/session'

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface UserAvatarProps {
  /** Show the display name next to the avatar */
  showName?: boolean
  /** Render for placement on the dark header band */
  onDark?: boolean
}

export default function UserAvatar({ showName = false, onDark = false }: UserAvatarProps) {
  const backendInfo = useAppStore((s) => s.backendInfo)
  const authChecked = useAppStore((s) => s.authChecked)
  const user = useAppStore((s) => s.user)

  if (!backendInfo?.auth_enabled || !authChecked) return null

  if (!user) {
    return (
      <Button
        type="text"
        size="small"
        icon={<LoginOutlined />}
        onClick={() => { window.location.href = loginUrl() }}
        style={{
          fontSize: 12,
          color: onDark ? '#eaf1f8' : '#1677ff',
          padding: 0,
          letterSpacing: onDark ? '0.02em' : undefined,
        }}
      >
        Sign in
      </Button>
    )
  }

  const displayName = user.name ?? user.email ?? user.sub
  const initials = getInitials(displayName)

  const menuItem = { justifyContent: 'flex-start', fontSize: 13, paddingInline: 8 } as const
  const popoverContent = (
    <div style={{ minWidth: 190 }}>
      <div style={{ padding: '0 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{displayName}</div>
        {user.email && user.email !== displayName && (
          <div style={{ fontSize: 11, color: t.textFaint }}>{user.email}</div>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${t.line}`, margin: '8px -12px 4px' }} />
      <Button type="text" block icon={<SwapOutlined />} onClick={() => switchAccount()} style={{ ...menuItem, color: t.text }}>
        Switch account
      </Button>
      <Button type="text" block icon={<LogoutOutlined />} onClick={() => signOut()} style={{ ...menuItem, color: t.textMuted }}>
        Sign out
      </Button>
    </div>
  )

  return (
    <Popover content={popoverContent} trigger="click" placement="bottomRight">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: onDark ? 'rgba(234, 241, 248, 0.16)' : '#1677ff',
            border: onDark ? '1px solid rgba(234, 241, 248, 0.4)' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
        {showName && (
          <Typography.Text style={{ fontSize: 12, color: onDark ? '#eaf1f8' : undefined }}>
            {displayName}
          </Typography.Text>
        )}
      </div>
    </Popover>
  )
}
