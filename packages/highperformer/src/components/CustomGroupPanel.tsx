import { useRef, useState } from 'react'
import { AutoComplete, Input, Button, Checkbox, Modal, Popover, Tooltip, Typography, Tag } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons'
import useAppStore from '../store/useAppStore'

function CustomGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const obsColumnNames = useAppStore((s) => s.obsColumnNames)
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupIds = useAppStore((s) => s.customGroupIds)
  const customGroupLoading = useAppStore((s) => s.customGroupLoading)
  const selectByIds = useAppStore((s) => s.selectByIds)

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
    onClose()
  }

  const parsedCount = parseIds(idsText).length

  return (
    <Modal
      title="Custom Group"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApply}
          loading={customGroupLoading}
          disabled={!column || parsedCount === 0}
        >
          Apply ({parsedCount} IDs)
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 12 }}>
        <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Obs Column</Typography.Text>
        <AutoComplete
          ref={autoCompleteRef as never}
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
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>IDs</Typography.Text>
        <Input.TextArea
          placeholder="Paste IDs (one per line or comma-separated)"
          value={idsText}
          onChange={(e) => setIdsText(e.target.value)}
          rows={8}
          style={{ fontSize: 12 }}
        />
      </div>
    </Modal>
  )
}

export default function CustomGroupPanel() {
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupUnmatched = useAppStore((s) => s.customGroupUnmatched)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const setSelectionDisplayMode = useAppStore((s) => s.setSelectionDisplayMode)
  const clearCustomGroup = useAppStore((s) => s.clearCustomGroup)
  const toggleCustomGroupId = useAppStore((s) => s.toggleCustomGroupId)
  const setAllCustomGroupIds = useAppStore((s) => s.setAllCustomGroupIds)

  const [modalOpen, setModalOpen] = useState(false)

  const matchedIds = Object.keys(customGroupIndexMap)
  const hasCustomGroup = customGroupColumn !== null

  return (
    <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasCustomGroup ? 8 : 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography.Text strong style={{ fontSize: 11 }}>Custom Group</Typography.Text>
          <Popover
            content={
              <div style={{ maxWidth: 250, fontSize: 12 }}>
                Non-matching cells are hidden by default but can be toggled
                back using the eye icon.
              </div>
            }
            trigger="click"
            placement="bottomLeft"
          >
            <InfoCircleOutlined style={{ fontSize: 11, color: '#999', cursor: 'pointer' }} />
          </Popover>
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!hasCustomGroup && (
            <Button type="text" size="small" onClick={() => setModalOpen(true)}>
              + Add
            </Button>
          )}
          {hasCustomGroup && (
            <Tooltip title={selectionDisplayMode === 'hide' ? 'Dim unselected' : 'Hide unselected'} placement="top">
              <Button
                type="text"
                size="small"
                icon={selectionDisplayMode === 'hide' ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setSelectionDisplayMode(selectionDisplayMode === 'hide' ? 'dim' : 'hide')}
              />
            </Tooltip>
          )}
          {hasCustomGroup && (
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Button type="text" size="small" onClick={() => setModalOpen(true)}>
                    Edit
                  </Button>
                  <Button type="text" size="small" danger onClick={clearCustomGroup}>
                    Remove
                  </Button>
                </div>
              }
            >
              <Button type="text" size="small" icon={<SettingOutlined />} />
            </Popover>
          )}
        </div>
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
        <div style={{ marginTop: hasCustomGroup ? 0 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Typography.Text style={{ fontSize: 11, color: '#666' }}>
              {customGroupEnabledIds.size}/{matchedIds.length} IDs enabled
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

      <CustomGroupModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
