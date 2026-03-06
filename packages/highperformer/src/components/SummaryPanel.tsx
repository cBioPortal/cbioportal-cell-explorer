import { Segmented, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'

const SOFT_CAP = 10

export default function SummaryPanel() {
  const summaryPanelOpen = useAppStore((s) => s.summaryPanelOpen)
  const setSummaryPanelOpen = useAppStore((s) => s.setSummaryPanelOpen)
  const summaryViewMode = useAppStore((s) => s.summaryViewMode)
  const setSummaryViewMode = useAppStore((s) => s.setSummaryViewMode)
  const selectionGroups = useAppStore((s) => s.selectionGroups)
  const pinnedObsColumns = useAppStore((s) => s.pinnedObsColumns)
  const pinnedGenes = useAppStore((s) => s.pinnedGenes)

  if (!summaryPanelOpen) return null

  const hasGroups = selectionGroups.some((g) => g.indices.length > 0)
  const totalPinned = pinnedObsColumns.length + pinnedGenes.length
  const showWarning = totalPinned >= SOFT_CAP

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography.Text strong style={{ fontSize: 14 }}>Summary</Typography.Text>
        <CloseOutlined
          style={{ fontSize: 12, cursor: 'pointer', color: '#999' }}
          onClick={() => setSummaryPanelOpen(false)}
        />
      </div>

      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Segmented
          block
          size="small"
          value={summaryViewMode}
          onChange={(v) => setSummaryViewMode(v as 'byVariable' | 'byGroup')}
          options={[
            { label: 'By Variable', value: 'byVariable' },
            { label: 'By Group', value: 'byGroup' },
          ]}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {!hasGroups ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Draw a selection to see summaries.
          </Typography.Text>
        ) : (
          <>
            {showWarning && (
              <Typography.Text type="warning" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                {totalPinned} variables pinned — this may increase memory usage.
              </Typography.Text>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Variable pickers and charts coming next.
            </Typography.Text>
          </>
        )}
      </div>
    </div>
  )
}
