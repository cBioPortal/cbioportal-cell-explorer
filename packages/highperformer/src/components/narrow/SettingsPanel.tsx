import { Drawer, Tabs } from 'antd'
import { ControlsPanel } from '../ControlsPanel'
import SummaryPanel from '../SummaryPanel'

/**
 * ⚙ on narrow screens: everything the desktop sidebars hold. Summary gets a
 * tab only when chat is available — otherwise it is already in the sheet.
 */
export function SettingsPanel({ open, onClose, chatAvailable }: {
  open: boolean
  onClose: () => void
  chatAvailable: boolean
}) {
  const controls = <ControlsPanel showBranding={false} showDisplayMode />
  return (
    <Drawer
      placement="right"
      width="100%"
      open={open}
      onClose={onClose}
      title="Settings"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {chatAvailable ? (
        <Tabs
          tabBarStyle={{ paddingInline: 16, marginBottom: 0 }}
          items={[
            { key: 'controls', label: 'Controls', children: controls },
            { key: 'summary', label: 'Summary', children: <SummaryPanel alwaysOpen collapsed={false} onExpand={() => {}} /> },
          ]}
        />
      ) : (
        controls
      )}
    </Drawer>
  )
}
