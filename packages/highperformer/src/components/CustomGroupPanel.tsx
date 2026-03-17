import { useEffect, useRef, useState } from 'react'
import { AutoComplete, Input, Button, Checkbox, Collapse, Modal, Popover, Tooltip, Typography, Tag } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons'
import VirtualList from '@rc-component/virtual-list'
import useAppStore from '../store/useAppStore'

function CustomGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const obsColumnNames = useAppStore((s) => s.obsColumnNames)
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupIds = useAppStore((s) => s.customGroupIds)
  const customGroupLoading = useAppStore((s) => s.customGroupLoading)
  const customGroupWarning = useAppStore((s) => s.customGroupWarning)
  const customGroupUnmatched = useAppStore((s) => s.customGroupUnmatched)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const customGroupRecomputing = useAppStore((s) => s.customGroupRecomputing)
  const loadCustomGroupColumn = useAppStore((s) => s.loadCustomGroupColumn)
  const selectByIds = useAppStore((s) => s.selectByIds)
  const toggleCustomGroupId = useAppStore((s) => s.toggleCustomGroupId)
  const setAllCustomGroupIds = useAppStore((s) => s.setAllCustomGroupIds)
  const commitCustomGroupToggle = useAppStore((s) => s.commitCustomGroupToggle)
  const cancelCustomGroupToggle = useAppStore((s) => s.cancelCustomGroupToggle)

  const [column, setColumn] = useState<string | null>(customGroupColumn)
  const [columnSearch, setColumnSearch] = useState('')
  const [idsText, setIdsText] = useState(customGroupIds.join('\n'))
  const [listSearch, setListSearch] = useState('')
  const [committing, setCommitting] = useState(false)
  const autoCompleteRef = useRef<{ blur: () => void } | null>(null)

  useEffect(() => {
    if (!customGroupRecomputing) setCommitting(false)
  }, [customGroupRecomputing])

  const matchedIds = Object.keys(customGroupIndexMap)
  const hasBrowseData = matchedIds.length > 0

  const filteredIds = listSearch
    ? matchedIds.filter((id) => id.toLowerCase().includes(listSearch.toLowerCase()))
    : matchedIds

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

    if (hasBrowseData) {
      // Column already loaded — just toggle on matched IDs in the Transfer
      const availableSet = new Set(matchedIds)
      const matched = ids.filter((id) => availableSet.has(id))
      const unmatched = ids.filter((id) => !availableSet.has(id))

      const { customGroupPreviousEnabledIds } = useAppStore.getState()
      const prev = customGroupPreviousEnabledIds ?? new Set(customGroupEnabledIds)
      const next = new Set(customGroupEnabledIds)
      for (const id of matched) next.add(id)

      useAppStore.setState({
        customGroupEnabledIds: next,
        customGroupRecomputing: true,
        customGroupPreviousEnabledIds: prev,
        customGroupUnmatched: unmatched,
      })
    } else {
      // Column not loaded yet — use selectByIds which fetches + builds index map
      selectByIds(column, ids)
    }
  }

  const handleCommit = () => {
    setCommitting(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        commitCustomGroupToggle()
        onClose()
      })
    })
  }

  const parsedCount = parseIds(idsText).length

  return (
    <Modal
      title="Custom Group"
      open={open}
      onCancel={onClose}
      footer={[
        ...(customGroupRecomputing ? [
          <Button key="cancel-toggle" onClick={cancelCustomGroupToggle}>
            Undo Changes
          </Button>,
        ] : []),
        <Button key="close" onClick={onClose}>
          {customGroupRecomputing ? 'Close' : 'Cancel'}
        </Button>,
        ...(customGroupRecomputing ? [
          <Button key="update" type="primary" onClick={handleCommit} loading={committing}>
            Update
          </Button>,
        ] : []),
      ]}
      width={520}
    >
      <div style={{ marginBottom: 12 }}>
        <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Obs Column {customGroupLoading && <span style={{ color: '#999', fontWeight: 400 }}>· loading...</span>}
        </Typography.Text>
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
            loadCustomGroupColumn(value)
          }}
          onClear={() => {
            setColumn(null)
            setColumnSearch('')
            useAppStore.setState({
              customGroupColumn: null,
              customGroupIndexMap: {},
              customGroupEnabledIds: new Set(),
              customGroupCommittedCount: 0,
              customGroupUnmatched: [],
              customGroupWarning: null,
              customGroupRecomputing: false,
              customGroupPreviousEnabledIds: null,
            })
          }}
          allowClear
          style={{ width: '100%' }}
        />
      </div>

      {customGroupWarning && (
        <Typography.Text type="warning" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          {customGroupWarning}
        </Typography.Text>
      )}

      {!column && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
          Select an obs column to get started
        </div>
      )}

      {column && customGroupLoading && (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12, border: '1px solid #f0f0f0', borderRadius: 4 }}>
          Loading column values...
        </div>
      )}

      {column && !customGroupLoading && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Typography.Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Paste IDs</Typography.Text>
              <Input.TextArea
                placeholder="Paste IDs (one per line or comma-separated)"
                value={idsText}
                onChange={(e) => setIdsText(e.target.value)}
                rows={2}
                style={{ fontSize: 12 }}
              />
            </div>
            <Button
              type="primary"
              onClick={handleApply}
              loading={customGroupLoading}
              disabled={parsedCount === 0}
            >
              Apply ({parsedCount})
            </Button>
          </div>

          {customGroupUnmatched.length > 0 && (
            <div style={{ fontSize: 11, marginBottom: 12 }}>
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
        </>
      )}

      {hasBrowseData && (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox
              checked={customGroupEnabledIds.size === matchedIds.length && matchedIds.length > 0}
              indeterminate={customGroupEnabledIds.size > 0 && customGroupEnabledIds.size < matchedIds.length}
              onChange={(e) => setAllCustomGroupIds(e.target.checked)}
              style={{ fontSize: 11 }}
            >
              <span style={{ fontSize: 11 }}>
                {customGroupEnabledIds.size}/{matchedIds.length}
              </span>
            </Checkbox>
            <Input
              size="small"
              placeholder="Search..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              allowClear
              style={{ flex: 1, fontSize: 11 }}
            />
          </div>
          <VirtualList
            data={filteredIds}
            height={250}
            itemHeight={28}
            itemKey={(id: string) => id}
          >
            {(id: string) => (
              <div style={{ padding: '2px 8px' }}>
                <Checkbox
                  checked={customGroupEnabledIds.has(id)}
                  onChange={() => toggleCustomGroupId(id)}
                  style={{ fontSize: 11 }}
                >
                  <span style={{ fontSize: 11 }}>{id}</span>
                  <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>
                    ({customGroupIndexMap[id]?.length ?? 0})
                  </span>
                </Checkbox>
              </div>
            )}
          </VirtualList>
        </div>
      )}
    </Modal>
  )
}

export default function CustomGroupPanel() {
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupWarning = useAppStore((s) => s.customGroupWarning)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const setSelectionDisplayMode = useAppStore((s) => s.setSelectionDisplayMode)
  const clearCustomGroup = useAppStore((s) => s.clearCustomGroup)

  const [modalOpen, setModalOpen] = useState(false)

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

              {!hasCustomGroup && matchedIds.length === 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  Click "+ Add" to create a custom group from IDs.
                </Typography.Text>
              )}

              {hasCustomGroup && (
                <Typography.Text style={{ fontSize: 11, color: '#666' }}>
                  {customGroupEnabledIds.size}/{matchedIds.length} IDs enabled
                  {' · '}
                  <a onClick={() => setModalOpen(true)} style={{ fontSize: 11 }}>Manage IDs</a>
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
