import { Button, Popover, Typography } from 'antd'
import { LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'

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
}

export default function UserAvatar({ showName = false }: UserAvatarProps) {
  const backendInfo = useAppStore((s) => s.backendInfo)
  const authChecked = useAppStore((s) => s.authChecked)
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  if (!backendInfo?.auth_enabled || !authChecked) return null

  if (!user) {
    return (
      <Button
        type="text"
        size="small"
        icon={<LoginOutlined />}
        onClick={() => { window.location.href = '/api/auth/login' }}
        style={{ fontSize: 12, color: '#1677ff', padding: 0 }}
      >
        Sign in
      </Button>
    )
  }

  const displayName = user.name ?? user.email ?? user.sub
  const initials = getInitials(displayName)

  const popoverContent = (
    <div style={{ minWidth: 140 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{displayName}</div>
      {user.email && user.email !== displayName && (
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{user.email}</div>
      )}
      <Button
        type="text"
        size="small"
        icon={<LogoutOutlined />}
        onClick={() => logout()}
        style={{ fontSize: 12, color: '#999', padding: 0 }}
      >
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
            background: '#1677ff',
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
          <Typography.Text style={{ fontSize: 12 }}>{displayName}</Typography.Text>
        )}
      </div>
    </Popover>
  )
}
