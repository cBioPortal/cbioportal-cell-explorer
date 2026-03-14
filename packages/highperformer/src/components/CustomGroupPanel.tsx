import { useRef, useState } from 'react'
import { AutoComplete, Input, Button, Checkbox, Typography, Tag } from 'antd'
import useAppStore from '../store/useAppStore'

export default function CustomGroupPanel() {
  const obsColumnNames = useAppStore((s) => s.obsColumnNames)
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupIds = useAppStore((s) => s.customGroupIds)
  const customGroupUnmatched = useAppStore((s) => s.customGroupUnmatched)
  const customGroupLoading = useAppStore((s) => s.customGroupLoading)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const selectByIds = useAppStore((s) => s.selectByIds)
  const clearCustomGroup = useAppStore((s) => s.clearCustomGroup)
  const toggleCustomGroupId = useAppStore((s) => s.toggleCustomGroupId)
  const setAllCustomGroupIds = useAppStore((s) => s.setAllCustomGroupIds)

  const [column, setColumn] = useState<string | null>(customGroupColumn)
  const [columnSearch, setColumnSearch] = useState('')
  const [idsText, setIdsText] = useState(customGroupIds.join('\n'))
  const autoCompleteRef = useRef<{ blur: () => void } | null>(null)

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
  const matchedIds = Object.keys(customGroupIndexMap)

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

      <AutoComplete
        ref={autoCompleteRef as never}
        size="small"
        placeholder="Search obs column"
        value={column ?? columnSearch}
        options={obsColumnNames
          .filter((n) => n.toLowerCase().includes(columnSearch.toLowerCase()))
          .map((n) => ({ label: n, value: n }))}
        onSearch={(text) => {
          setColumnSearch(text)
          if (column) setColumn(null)
        }}
        onSelect={(value: string) => {
          setColumn(value)
          setColumnSearch('')
          autoCompleteRef.current?.blur()
        }}
        onClear={() => {
          setColumn(null)
          setColumnSearch('')
        }}
        allowClear
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

      {matchedIds.length > 0 && (
        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Typography.Text strong style={{ fontSize: 11 }}>
              Toggle IDs ({customGroupEnabledIds.size}/{matchedIds.length})
            </Typography.Text>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button type="text" size="small" onClick={() => setAllCustomGroupIds(true)} disabled={customGroupEnabledIds.size === matchedIds.length}>
                All
              </Button>
              <Button type="text" size="small" onClick={() => setAllCustomGroupIds(false)} disabled={customGroupEnabledIds.size === 0}>
                None
              </Button>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matchedIds.map((id) => (
              <Checkbox
                key={id}
                checked={customGroupEnabledIds.has(id)}
                onChange={() => toggleCustomGroupId(id)}
                style={{ fontSize: 11 }}
              >
                <span style={{ fontSize: 11 }}>{id}</span>
                <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                  ({customGroupIndexMap[id]?.length ?? 0})
                </span>
              </Checkbox>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
