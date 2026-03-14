import { useState } from 'react'
import { Select, Input, Button, Typography, Tag } from 'antd'
import useAppStore from '../store/useAppStore'

export default function CustomGroupPanel() {
  const obsColumnNames = useAppStore((s) => s.obsColumnNames)
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupIds = useAppStore((s) => s.customGroupIds)
  const customGroupUnmatched = useAppStore((s) => s.customGroupUnmatched)
  const customGroupLoading = useAppStore((s) => s.customGroupLoading)
  const selectByIds = useAppStore((s) => s.selectByIds)
  const clearCustomGroup = useAppStore((s) => s.clearCustomGroup)

  const [column, setColumn] = useState<string | null>(customGroupColumn)
  const [idsText, setIdsText] = useState(customGroupIds.join('\n'))

  const parseIds = (text: string): string[] => {
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  const handleApply = () => {
    if (!column) return
    const ids = parseIds(idsText)
    if (ids.length === 0) return
    setIdsText(ids.join('\n'))
    selectByIds(column, ids)
  }

  const parsedCount = parseIds(idsText).length

  return (
    <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 11 }}>Custom Group</Typography.Text>
        {customGroupColumn && (
          <Button type="text" size="small" danger onClick={clearCustomGroup}>
            Remove
          </Button>
        )}
      </div>

      <Select
        size="small"
        placeholder="Select obs column"
        value={column}
        onChange={setColumn}
        options={obsColumnNames.map((n) => ({ label: n, value: n }))}
        style={{ width: '100%', marginBottom: 6 }}
      />

      <Input.TextArea
        size="small"
        placeholder="Paste IDs (one per line or comma-separated)"
        value={idsText}
        onChange={(e) => setIdsText(e.target.value)}
        rows={4}
        style={{ marginBottom: 6, fontSize: 11 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Button
          size="small"
          type="primary"
          onClick={handleApply}
          loading={customGroupLoading}
          disabled={!column || parsedCount === 0}
        >
          Apply ({parsedCount} IDs)
        </Button>
      </div>

      {customGroupUnmatched.length > 0 && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          <Typography.Text type="warning" style={{ fontSize: 11 }}>
            {customGroupUnmatched.length} ID{customGroupUnmatched.length > 1 ? 's' : ''} not found:
          </Typography.Text>
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {customGroupUnmatched.map((id) => (
              <Tag key={id} color="warning" style={{ fontSize: 10, margin: 0 }}>
                {id}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
