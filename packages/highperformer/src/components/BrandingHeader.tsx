import { Link } from 'react-router-dom'
import { Popover, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'

const infoRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }

function InfoPopoverContent() {
  const backendInfo = useAppStore((s) => s.backendInfo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={infoRowStyle}>
        <Typography.Text type="secondary">Version</Typography.Text>
        <Typography.Text>v{__APP_VERSION__}</Typography.Text>
      </div>
      <div style={infoRowStyle}>
        <Typography.Text type="secondary">SHA</Typography.Text>
        <Typography.Text code style={{ fontSize: 11 }}>{__COMMIT_HASH__}</Typography.Text>
      </div>
      {backendInfo && (
        <>
          <div style={infoRowStyle}>
            <Typography.Text type="secondary">API version</Typography.Text>
            <Typography.Text>v{backendInfo.version}</Typography.Text>
          </div>
          <div style={infoRowStyle}>
            <Typography.Text type="secondary">API environment</Typography.Text>
            <Typography.Text>{backendInfo.environment}</Typography.Text>
          </div>
          {backendInfo.git_sha && (
            <div style={infoRowStyle}>
              <Typography.Text type="secondary">API SHA</Typography.Text>
              <Typography.Text code style={{ fontSize: 11 }}>{backendInfo.git_sha}</Typography.Text>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BrandingHeader() {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          cBioPortal Cell Explorer{' '}
          <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>v{__APP_VERSION__}</span>
        </Typography.Title>
      </Link>
      <Popover content={<InfoPopoverContent />} trigger="click" placement="bottomRight">
        <InfoCircleOutlined style={{ fontSize: 14, color: '#999', cursor: 'pointer' }} />
      </Popover>
    </div>
  )
}

export default BrandingHeader
