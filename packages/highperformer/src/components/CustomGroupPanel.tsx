import { useEffect, useRef, useState } from 'react'
import { AutoComplete, Input, Button, Checkbox, Collapse, Modal, Popover, Spin, Tooltip, Typography, Tag } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons'
import VirtualList from '@rc-component/virtual-list'
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
  const customGroupWarning = useAppStore((s) => s.customGroupWarning)
  const customGroupRecomputing = useAppStore((s) => s.customGroupRecomputing)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const setSelectionDisplayMode = useAppStore((s) => s.setSelectionDisplayMode)
  const clearCustomGroup = useAppStore((s) => s.clearCustomGroup)
  const toggleCustomGroupId = useAppStore((s) => s.toggleCustomGroupId)
  const setAllCustomGroupIds = useAppStore((s) => s.setAllCustomGroupIds)
  const commitCustomGroupToggle = useAppStore((s) => s.commitCustomGroupToggle)
  const cancelCustomGroupToggle = useAppStore((s) => s.cancelCustomGroupToggle)

  const [modalOpen, setModalOpen] = useState(false)
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    if (!customGroupRecomputing) setCommitting(false)
  }, [customGroupRecomputing])

  const matchedIds = Object.keys(customGroupIndexMap)
  const hasCustomGroup = customGroupColumn !== null

  const headerExtra = (
    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
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
  )

  const collapseLabel = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600 }}>Custom Group</span>
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
        <InfoCircleOutlined style={{ fontSize: 11, color: '#999', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()} />
      </Popover>
      {hasCustomGroup && (
        <span style={{ fontSize: 10, color: '#999' }}>
          ({customGroupEnabledIds.size}/{matchedIds.length})
        </span>
      )}
    </span>
  )

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
      <Collapse
        ghost
        size="small"
        defaultActiveKey={hasCustomGroup ? ['custom'] : []}
        items={[{
          key: 'custom',
          label: collapseLabel,
          extra: headerExtra,
          children: (
            <>
              {customGroupWarning && (
                <Typography.Text type="warning" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                  {customGroupWarning}
                </Typography.Text>
              )}

              {customGroupUnmatched.length > 0 && (
                <div style={{ fontSize: 11, marginBottom: 8 }}>
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {customGroupRecomputing && (
                        <>
                          <Button
                            size="small"
                            type="primary"
                            loading={committing}
                            onClick={() => {
                              setCommitting(true)
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  commitCustomGroupToggle()
                                })
                              })
                            }}
                          >
                            Update
                          </Button>
                          <Button size="small" onClick={cancelCustomGroupToggle}>
                            Cancel
                          </Button>
                        </>
                      )}
                      <Button type="text" size="small" onClick={() => setAllCustomGroupIds(true)} disabled={customGroupEnabledIds.size === matchedIds.length}>
                        All
                      </Button>
                      <Button type="text" size="small" onClick={() => setAllCustomGroupIds(false)} disabled={customGroupEnabledIds.size === 0}>
                        None
                      </Button>
                    </div>
                  </div>
                  <VirtualList
                    data={matchedIds}
                    height={200}
                    itemHeight={24}
                    itemKey={(id: string) => id}
                  >
                    {(id: string) => (
                      <Checkbox
                        checked={customGroupEnabledIds.has(id)}
                        onChange={() => toggleCustomGroupId(id)}
                        style={{ fontSize: 11, height: 24, display: 'flex', alignItems: 'center' }}
                      >
                        <span style={{ fontSize: 11 }}>{id}</span>
                        <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                          ({customGroupIndexMap[id]?.length ?? 0})
                        </span>
                      </Checkbox>
                    )}
                  </VirtualList>
                </div>
              )}

              {!hasCustomGroup && matchedIds.length === 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Click "+ Add" to create a custom group from IDs.
                </Typography.Text>
              )}
            </>
          ),
        }]}
      />
      <CustomGroupModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
