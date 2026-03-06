import { useState } from 'react'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { Popover, Segmented, Typography } from 'antd'
import { ExpandOutlined } from '@ant-design/icons'
import type { SelectionGroup } from '../store/useAppStore'
import type { RGB } from '../utils/colors'
import ChartModal from './ChartModal'

interface CategorySummaryChartProps {
  name: string
  categoryMap: { label: string; color: RGB }[]
  countsByGroup: Map<number, Uint32Array>
  groups: SelectionGroup[]
}

interface CategoryRow {
  label: string
  counts: Record<number, number>
  total: Record<number, number>
}

type StackMode = 'count' | 'percent'

const MARGIN = { top: 4, right: 12, bottom: 4, left: 100 }
const BAR_HEIGHT = 16
const MAX_CATS_INLINE = 5

function buildData(
  categoryMap: { label: string; color: RGB }[],
  countsByGroup: Map<number, Uint32Array>,
  activeGroups: SelectionGroup[],
): CategoryRow[] {
  const data: CategoryRow[] = []
  for (let ci = 0; ci < categoryMap.length; ci++) {
    const counts: Record<number, number> = {}
    let hasAny = false
    const totals: Record<number, number> = {}
    for (const g of activeGroups) {
      const c = countsByGroup.get(g.id)
      const count = c ? c[ci] : 0
      counts[g.id] = count
      const total = c ? Array.from(c).reduce((a, b) => a + b, 0) : 0
      totals[g.id] = total
      if (count > 0) hasAny = true
    }
    if (hasAny) {
      data.push({ label: categoryMap[ci].label, counts, total: totals })
    }
  }
  data.sort((a, b) => {
    const sumA = Object.values(a.counts).reduce((x, y) => x + y, 0)
    const sumB = Object.values(b.counts).reduce((x, y) => x + y, 0)
    return sumB - sumA
  })
  return data
}

interface GroupInfo {
  groupId: number
  color: string
  count: number
  pct: string
}

interface PopoverData {
  label: string
  highlightGroupId: number
  groups: GroupInfo[]
}

function StackedBarChart({ data, activeGroups, width, margin, mode }: {
  data: CategoryRow[]
  activeGroups: SelectionGroup[]
  width: number
  margin: typeof MARGIN
  mode: StackMode
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [popover, setPopover] = useState<{ key: string; data: PopoverData } | null>(null)
  const rowHeight = BAR_HEIGHT + 4
  const height = data.length * rowHeight + margin.top + margin.bottom
  const innerWidth = width - margin.left - margin.right

  let maxValue = 1
  if (mode === 'count') {
    for (const d of data) {
      const sum = activeGroups.reduce((acc, g) => acc + (d.counts[g.id] ?? 0), 0)
      if (sum > maxValue) maxValue = sum
    }
  } else {
    maxValue = 100
  }

  const yScale = scaleBand({
    domain: data.map((d) => d.label),
    range: [margin.top, height - margin.bottom],
    padding: 0.15,
  })

  const xScale = scaleLinear({
    domain: [0, maxValue],
    range: [0, innerWidth],
  })

  return (
    <svg
      width={width}
      height={height}
      onMouseLeave={() => setHoverKey(null)}
    >
      <Group left={margin.left}>
        {data.map((d) => {
          const y = yScale(d.label) ?? 0
          const barH = yScale.bandwidth()
          const totalCount = activeGroups.reduce((acc, g) => acc + (d.counts[g.id] ?? 0), 0)
          let xOffset = 0

          return activeGroups.map((g) => {
            const count = d.counts[g.id] ?? 0
            const value = mode === 'percent'
              ? (totalCount > 0 ? (count / totalCount) * 100 : 0)
              : count
            const barWidth = xScale(value)
            const x = xScale(xOffset)
            xOffset += value
            const key = `${d.label}-${g.id}`
            const rowKey = d.label
            const isHovered = hoverKey === key
            const isPopoverOpen = popover?.key === rowKey && popover.data.highlightGroupId === g.id
            const color = `rgb(${g.color.join(',')})`

            const handleClick = () => {
              if (popover?.key === rowKey && popover.data.highlightGroupId === g.id) {
                setPopover(null)
              } else {
                const groups: GroupInfo[] = activeGroups.map((ag) => {
                  const c = d.counts[ag.id] ?? 0
                  const p = totalCount > 0 ? ((c / totalCount) * 100).toFixed(1) : '0.0'
                  return { groupId: ag.id, color: `rgb(${ag.color.join(',')})`, count: c, pct: p }
                })
                setPopover({ key: rowKey, data: { label: d.label, highlightGroupId: g.id, groups } })
              }
            }

            const rectEl = (
              <rect
                key={key}
                fill={color}
                stroke={isHovered || isPopoverOpen ? '#333' : 'none'}
                strokeWidth={isHovered || isPopoverOpen ? 1.5 : 0}
                style={{
                  x, y, width: barWidth, height: barH,
                  transition: 'x 300ms ease, width 300ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={handleClick}
              />
            )

            if (isPopoverOpen) {
              return (
                <Popover
                  key={key}
                  open
                  placement="left"
                  onOpenChange={(open) => { if (!open) setPopover(null) }}
                  content={
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{popover.data.label}</div>
                      {popover.data.groups.map((gi) => (
                        <div key={gi.groupId} style={{ fontWeight: gi.groupId === g.id ? 600 : 400 }}>
                          <span style={{ color: gi.color }}>G{gi.groupId}</span>: {gi.count.toLocaleString()} ({gi.pct}%)
                        </div>
                      ))}
                    </div>
                  }
                >
                  {rectEl}
                </Popover>
              )
            }

            return rectEl
          })
        })}
        <AxisLeft
          scale={yScale}
          tickValues={data.map((d) => d.label)}
          stroke="#e8e8e8"
          tickStroke="none"
          tickLabelProps={{
            fill: '#666',
            fontSize: 10,
            textAnchor: 'end',
            dy: '0.33em',
          }}
          tickFormat={(v) => {
            const s = String(v)
            return s.length > 18 ? s.slice(0, 16) + '\u2026' : s
          }}
        />
      </Group>
    </svg>
  )
}

const VERTICAL_MARGIN_BASE = { top: 12, right: 16, left: 48 }
const LABEL_MAX_CHARS = 30
const BAND_WIDTH = 32
const MIN_CHART_WIDTH = 400

function VerticalStackedBarChart({ data, activeGroups, mode }: {
  data: CategoryRow[]
  activeGroups: SelectionGroup[]
  mode: StackMode
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [popover, setPopover] = useState<{ key: string; data: PopoverData } | null>(null)
  const maxLabelLen = Math.min(
    data.reduce((max, d) => Math.max(max, d.label.length), 0),
    LABEL_MAX_CHARS,
  )
  // fontSize 10, ~6px per char. Rotated 45° with textAnchor 'end':
  // vertical extent = len * 6 * sin(45°), horizontal extent = len * 6 * cos(45°)
  const COS45 = 0.707
  const charPx = 6
  const bottomMargin = Math.max(48, maxLabelLen * charPx * COS45 + 30)
  const leftMargin = Math.max(VERTICAL_MARGIN_BASE.left, maxLabelLen * charPx * COS45 + 8)
  const margin = { ...VERTICAL_MARGIN_BASE, bottom: bottomMargin, left: leftMargin }
  const innerWidth = Math.max(data.length * BAND_WIDTH, MIN_CHART_WIDTH)
  const width = innerWidth + margin.left + margin.right
  const innerHeight = 300

  let maxValue = 1
  if (mode === 'count') {
    for (const d of data) {
      const sum = activeGroups.reduce((acc, g) => acc + (d.counts[g.id] ?? 0), 0)
      if (sum > maxValue) maxValue = sum
    }
  } else {
    maxValue = 100
  }

  const xScale = scaleBand({
    domain: data.map((d) => d.label),
    range: [0, innerWidth],
    padding: 0.2,
  })

  const yScale = scaleLinear({
    domain: [0, maxValue],
    range: [innerHeight, 0],
    nice: true,
  })

  return (
    <svg
      width={width}
      height={innerHeight + margin.top + margin.bottom}
      onMouseLeave={() => setHoverKey(null)}
    >
      <Group left={margin.left} top={margin.top}>
        {data.map((d) => {
          const x = xScale(d.label) ?? 0
          const barW = Math.min(xScale.bandwidth(), BAND_WIDTH)
          const barOffset = (xScale.bandwidth() - barW) / 2
          const totalCount = activeGroups.reduce((acc, g) => acc + (d.counts[g.id] ?? 0), 0)
          let yOffset = 0

          return activeGroups.map((g) => {
            const count = d.counts[g.id] ?? 0
            const value = mode === 'percent'
              ? (totalCount > 0 ? (count / totalCount) * 100 : 0)
              : count
            const barHeight = innerHeight - yScale(value)
            const barY = yScale(yOffset + value)
            yOffset += value
            const key = `${d.label}-${g.id}`
            const rowKey = d.label
            const isHovered = hoverKey === key
            const isPopoverOpen = popover?.key === rowKey && popover.data.highlightGroupId === g.id
            const color = `rgb(${g.color.join(',')})`

            const handleClick = () => {
              if (popover?.key === rowKey && popover.data.highlightGroupId === g.id) {
                setPopover(null)
              } else {
                const groups: GroupInfo[] = activeGroups.map((ag) => {
                  const c = d.counts[ag.id] ?? 0
                  const p = totalCount > 0 ? ((c / totalCount) * 100).toFixed(1) : '0.0'
                  return { groupId: ag.id, color: `rgb(${ag.color.join(',')})`, count: c, pct: p }
                })
                setPopover({ key: rowKey, data: { label: d.label, highlightGroupId: g.id, groups } })
              }
            }

            const rectEl = (
              <rect
                key={key}
                fill={color}
                stroke={isHovered || isPopoverOpen ? '#333' : 'none'}
                strokeWidth={isHovered || isPopoverOpen ? 1.5 : 0}
                x={x + barOffset}
                y={barY}
                width={barW}
                height={barHeight}
                style={{ cursor: 'pointer', transition: 'y 300ms ease, height 300ms ease' }}
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={handleClick}
              />
            )

            if (isPopoverOpen) {
              return (
                <Popover
                  key={key}
                  open
                  placement="top"
                  onOpenChange={(open) => { if (!open) setPopover(null) }}
                  content={
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{popover.data.label}</div>
                      {popover.data.groups.map((gi) => (
                        <div key={gi.groupId} style={{ fontWeight: gi.groupId === g.id ? 600 : 400 }}>
                          <span style={{ color: gi.color }}>G{gi.groupId}</span>: {gi.count.toLocaleString()} ({gi.pct}%)
                        </div>
                      ))}
                    </div>
                  }
                >
                  {rectEl}
                </Popover>
              )
            }

            return rectEl
          })
        })}
        <AxisLeft
          scale={yScale}
          numTicks={5}
          stroke="#e8e8e8"
          tickStroke="#e8e8e8"
          tickLabelProps={{ fill: '#666', fontSize: 10 }}
        />
        <AxisBottom
          scale={xScale}
          top={innerHeight}
          tickValues={data.map((d) => d.label)}
          stroke="#e8e8e8"
          tickStroke="none"
          tickLabelProps={{
            fill: '#666',
            fontSize: 10,
            textAnchor: 'end',
            angle: -45,
            dx: -4,
            dy: -2,
          }}
          tickFormat={(v) => {
            const s = String(v)
            return s.length > LABEL_MAX_CHARS ? s.slice(0, LABEL_MAX_CHARS - 2) + '\u2026' : s
          }}
        />
      </Group>
    </svg>
  )
}

function CategoryTable({ data, activeGroups }: { data: CategoryRow[]; activeGroups: SelectionGroup[] }) {
  return (
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>Category</th>
          {activeGroups.map((g) => (
            <th key={`count-${g.id}`} style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px', borderBottom: '1px solid #f0f0f0', color: `rgb(${g.color.join(',')})` }}>
              G{g.id} count
            </th>
          ))}
          {activeGroups.map((g) => (
            <th key={`pct-${g.id}`} style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px', borderBottom: '1px solid #f0f0f0', color: `rgb(${g.color.join(',')})` }}>
              G{g.id} %
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.label}>
            <td style={{ padding: '2px 8px' }}>{row.label}</td>
            {activeGroups.map((g) => (
              <td key={`count-${g.id}`} style={{ textAlign: 'right', padding: '2px 8px' }}>
                {(row.counts[g.id] ?? 0).toLocaleString()}
              </td>
            ))}
            {activeGroups.map((g) => {
              const count = row.counts[g.id] ?? 0
              const total = row.total[g.id] ?? 1
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
              return (
                <td key={`pct-${g.id}`} style={{ textAlign: 'right', padding: '2px 8px' }}>{pct}%</td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

type InlineView = 'count' | 'percent' | 'table'

export default function CategorySummaryChart({ name, categoryMap, countsByGroup, groups }: CategorySummaryChartProps) {
  const [inlineView, setInlineView] = useState<InlineView>('count')
  const [modalOpen, setModalOpen] = useState(false)

  const activeGroups = groups.filter((g) => countsByGroup.has(g.id))

  if (activeGroups.length === 0) return null

  const data = buildData(categoryMap, countsByGroup, activeGroups)
  if (data.length === 0) return null

  // Filter out near-zero categories for the chart only
  const chartData = data.filter((d) =>
    activeGroups.some((g) => {
      const total = d.total[g.id]
      return total > 0 && (d.counts[g.id] / total) >= 0.005
    })
  )

  const inlineChartData = chartData.slice(0, MAX_CATS_INLINE)
  const inlineTableData = data.slice(0, MAX_CATS_INLINE)
  const truncatedChart = chartData.length > MAX_CATS_INLINE
  const truncatedTable = data.length > MAX_CATS_INLINE

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Typography.Text strong style={{ fontSize: 12 }}>{name}</Typography.Text>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Segmented
            size="small"
            value={inlineView}
            onChange={(v) => setInlineView(v as InlineView)}
            options={[
              { label: 'Count', value: 'count' },
              { label: '%', value: 'percent' },
              { label: 'Table', value: 'table' },
            ]}
            style={{ fontSize: 11 }}
          />
          <ExpandOutlined
            style={{ fontSize: 11, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => setModalOpen(true)}
          />
        </span>
      </div>

      {inlineView === 'table' ? (
        <>
          <CategoryTable data={inlineTableData} activeGroups={activeGroups} />
          {truncatedTable && <Typography.Text type="secondary" style={{ fontSize: 10 }}>...and {data.length - MAX_CATS_INLINE} more</Typography.Text>}
        </>
      ) : (
        <>
          <StackedBarChart data={inlineChartData} activeGroups={activeGroups} width={280} margin={MARGIN} mode={inlineView} />
          {truncatedChart && <Typography.Text type="secondary" style={{ fontSize: 10 }}>...and {chartData.length - MAX_CATS_INLINE} more</Typography.Text>}
        </>
      )}

      <ChartModal
        title={name}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        chart={<VerticalStackedBarChart data={chartData} activeGroups={activeGroups} mode={inlineView === 'table' ? 'count' : inlineView} />}
        table={<CategoryTable data={data} activeGroups={activeGroups} />}
      />
    </div>
  )
}
