import { useMemo } from 'react'
import { Typography } from 'antd'
import type { SelectionGroup } from '../store/useAppStore'
import useAppStore, { CUSTOM_GROUP_ID } from '../store/useAppStore'
import { ALL_CELLS_GROUP_ID } from '../constants'
import CustomGroupPanel from './CustomGroupPanel'

interface GroupOverviewProps {
  groups: SelectionGroup[]
  totalCells: number
}

interface OverlapStats {
  overlapCount: number
  unionCount: number
  uniqueCounts: Map<number, number>
  pairwiseOverlaps: Map<string, number>
}

/**
 * Compute overlap stats using a bitmask array instead of a Map<number, number[]>.
 * With at most 3 groups, we assign each group a bit (1, 2, 4) and use a Uint8Array
 * indexed by cell index. This avoids millions of Map entries and array allocations,
 * reducing O(N) Map operations to O(N) typed-array writes (~100x faster).
 */
function computeOverlap(groups: SelectionGroup[], totalCells: number): OverlapStats {
  const uniqueCounts = new Map<number, number>()
  const pairwiseOverlaps = new Map<string, number>()

  if (groups.length <= 1) {
    const count = groups[0]?.indices.length ?? 0
    if (groups[0]) uniqueCounts.set(groups[0].id, count)

    return { overlapCount: 0, unionCount: count, uniqueCounts, pairwiseOverlaps }
  }

  // Assign each group a bit position (0, 1, 2)
  const bitForGroup = new Map<number, number>()
  for (let i = 0; i < groups.length; i++) {
    bitForGroup.set(groups[i].id, 1 << i)
  }

  // Mark membership with bitmask — one byte per cell, no Map/array allocations
  const mask = new Uint8Array(totalCells)
  for (const g of groups) {
    const bit = bitForGroup.get(g.id)!
    for (let i = 0; i < g.indices.length; i++) {
      mask[g.indices[i]] |= bit
    }
  }

  // Count unique/overlap by scanning the mask
  // Pre-compute what each bitmask value means
  const bitCounts = new Uint32Array(1 << groups.length) // e.g., 8 entries for 3 groups
  for (let i = 0; i < totalCells; i++) {
    if (mask[i] !== 0) bitCounts[mask[i]]++
  }

  // Interpret bit patterns
  let overlapCount = 0
  let unionCount = 0
  for (const g of groups) uniqueCounts.set(g.id, 0)

  for (let pattern = 1; pattern < bitCounts.length; pattern++) {
    const count = bitCounts[pattern]
    if (count === 0) continue
    unionCount += count

    // Count set bits to determine if overlap
    const setBits: number[] = []
    for (let i = 0; i < groups.length; i++) {
      if (pattern & (1 << i)) setBits.push(i)
    }

    if (setBits.length === 1) {
      const gid = groups[setBits[0]].id
      uniqueCounts.set(gid, (uniqueCounts.get(gid) ?? 0) + count)
    } else {
      overlapCount += count
      for (let i = 0; i < setBits.length; i++) {
        for (let j = i + 1; j < setBits.length; j++) {
          const key = `${groups[setBits[i]].id}-${groups[setBits[j]].id}`
          pairwiseOverlaps.set(key, (pairwiseOverlaps.get(key) ?? 0) + count)
        }
      }
    }
  }

  return { overlapCount, unionCount, uniqueCounts, pairwiseOverlaps }
}

function circleOverlapArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0
  if (d + r2 <= r1) return Math.PI * r2 * r2
  if (d + r1 <= r2) return Math.PI * r1 * r1

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const angle1 = 2 * Math.atan2(h, a)
  const angle2 = 2 * Math.atan2(h, d - a)
  return 0.5 * r1 * r1 * (angle1 - Math.sin(angle1)) + 0.5 * r2 * r2 * (angle2 - Math.sin(angle2))
}

function findDistance(r1: number, r2: number, targetArea: number): number {
  if (targetArea <= 0) return r1 + r2
  const maxArea = Math.PI * Math.min(r1, r2) * Math.min(r1, r2)
  if (targetArea >= maxArea) return Math.abs(r1 - r2)

  let lo = Math.abs(r1 - r2)
  let hi = r1 + r2
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (circleOverlapArea(r1, r2, mid) > targetArea) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const SVG_WIDTH = 220
const SVG_HEIGHT = 140
const MAX_RADIUS = 50
const MIN_RADIUS = 18

function VennDiagram({ groups, stats, totalCells, customGroupCount }: {
  groups: SelectionGroup[]
  stats: OverlapStats
  totalCells: number
  customGroupCount: number
}) {
  const cy = SVG_HEIGHT / 2

  // Separate spatial and custom groups
  const spatialGroups = groups.filter((g) => g.id !== CUSTOM_GROUP_ID)
  const customGroup = groups.find((g) => g.id === CUSTOM_GROUP_ID)
  const hasCustom = customGroup != null && customGroupCount > 0
  const hasSpatial = spatialGroups.length > 0

  // Each half gets its own center
  const HALF_WIDTH = hasCustom && hasSpatial ? SVG_WIDTH / 2 : SVG_WIDTH
  const spatialCx = hasSpatial ? HALF_WIDTH / 2 : SVG_WIDTH / 2
  const customCx = hasSpatial ? SVG_WIDTH / 2 + HALF_WIDTH / 2 : SVG_WIDTH / 2

  // Radii — each half scales independently
  const spatialMaxRadius = hasCustom ? MAX_RADIUS * 0.8 : MAX_RADIUS
  const counts = spatialGroups.map((g) => g.indices.length)
  const spatialMax = counts.length > 0 ? Math.max(...counts) : 0
  const radii = counts.map((c) =>
    spatialMax > 0 ? MIN_RADIUS + (spatialMaxRadius - MIN_RADIUS) * Math.sqrt(c / spatialMax) : MIN_RADIUS
  )

  const customMaxRadius = hasSpatial ? MAX_RADIUS * 0.7 : MAX_RADIUS
  const customRadius = customGroupCount > 0
    ? MIN_RADIUS + (customMaxRadius - MIN_RADIUS) * Math.sqrt(Math.min(customGroupCount / (totalCells || 1), 1))
    : MIN_RADIUS

  // Layout spatial groups in left half
  let circles: { x: number; y: number; r: number }[] = []

  if (spatialGroups.length === 1) {
    circles = [{ x: spatialCx, y: cy, r: radii[0] }]
  } else if (spatialGroups.length === 2) {
    const overlapKey = `${spatialGroups[0].id}-${spatialGroups[1].id}`
    const overlapCount = stats.pairwiseOverlaps.get(overlapKey) ?? 0
    const totalArea1 = Math.PI * radii[0] * radii[0]
    const totalArea2 = Math.PI * radii[1] * radii[1]
    const overlapFraction = counts[0] > 0 && counts[1] > 0
      ? overlapCount / Math.min(counts[0], counts[1])
      : 0
    const targetArea = overlapFraction * Math.min(totalArea1, totalArea2)
    const dist = findDistance(radii[0], radii[1], targetArea)
    circles = [
      { x: spatialCx - dist / 2, y: cy, r: radii[0] },
      { x: spatialCx + dist / 2, y: cy, r: radii[1] },
    ]
  } else if (spatialGroups.length >= 3) {
    const pairDist = (i: number, j: number) => {
      const key1 = `${spatialGroups[i].id}-${spatialGroups[j].id}`
      const key2 = `${spatialGroups[j].id}-${spatialGroups[i].id}`
      const oc = stats.pairwiseOverlaps.get(key1) ?? stats.pairwiseOverlaps.get(key2) ?? 0
      const ai = Math.PI * radii[i] * radii[i]
      const aj = Math.PI * radii[j] * radii[j]
      const frac = counts[i] > 0 && counts[j] > 0 ? oc / Math.min(counts[i], counts[j]) : 0
      return findDistance(radii[i], radii[j], frac * Math.min(ai, aj))
    }

    const d01 = pairDist(0, 1)
    const raw: [number, number][] = [[0, 0], [d01, 0]]

    for (let k = 2; k < spatialGroups.length; k++) {
      const d0k = pairDist(0, k)
      const d1k = pairDist(1, k)
      const cosA = d01 > 0 ? (d0k * d0k + d01 * d01 - d1k * d1k) / (2 * d0k * d01) : 0
      const clampedA = Math.max(-1, Math.min(1, cosA))
      const sinA = Math.sqrt(1 - clampedA * clampedA)
      const sign = k % 2 === 0 ? -1 : 1
      raw.push([d0k * clampedA, sign * d0k * sinA])
    }

    const allX = raw.map((p, i) => [p[0] - radii[i], p[0] + radii[i]]).flat()
    const allY = raw.map((p, i) => [p[1] - radii[i], p[1] + radii[i]]).flat()
    const bx0 = Math.min(...allX), bx1 = Math.max(...allX)
    const by0 = Math.min(...allY), by1 = Math.max(...allY)
    const bw = bx1 - bx0, bh = by1 - by0
    const scale = Math.min((HALF_WIDTH - 20) / bw, (SVG_HEIGHT - 20) / bh, 1)
    const ox = spatialCx - ((bx0 + bx1) / 2) * scale
    const oy = cy - ((by0 + by1) / 2) * scale

    circles = raw.map((p, i) => ({ x: p[0] * scale + ox, y: p[1] * scale + oy, r: radii[i] * scale }))
  }

  // Custom group circle in right half (or centered if no spatial groups)
  if (hasCustom) {
    circles.push({ x: customCx, y: cy, r: customRadius })
  }

  // Combine groups for rendering
  const allGroups = hasCustom ? [...spatialGroups, customGroup] : spatialGroups

  const colors = allGroups.map((g) => `rgb(${g.color.join(',')})`)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={SVG_WIDTH} height={SVG_HEIGHT}>
          {/* Divider line between spatial and custom halves */}
          {hasCustom && hasSpatial && (
            <line
              x1={SVG_WIDTH / 2} y1={8}
              x2={SVG_WIDTH / 2} y2={SVG_HEIGHT - 8}
              stroke="#e8e8e8" strokeWidth={1} strokeDasharray="4 3"
            />
          )}
          {circles.map((c, i) => (
            <circle
              key={allGroups[i].id}
              cx={c.x} cy={c.y} r={c.r}
              fill={colors[i]} fillOpacity={0.3}
              stroke={colors[i]} strokeWidth={1.5}
            />
          ))}
          {/* Count labels */}
          {circles.map((c, i) => {
            const count = allGroups[i].id === CUSTOM_GROUP_ID
              ? customGroupCount
              : (stats.uniqueCounts.get(allGroups[i].id) ?? 0)
            return (
              <text key={`u-${allGroups[i].id}`} x={c.x} y={c.y} textAnchor="middle" dy="0.35em" fontSize={10} fill="#333">
                {count.toLocaleString()}
              </text>
            )
          })}
          {/* Overlap count at spatial centroid */}
          {spatialGroups.length > 1 && stats.overlapCount > 0 && (
            <text
              x={circles.slice(0, spatialGroups.length).reduce((s, c) => s + c.x, 0) / spatialGroups.length}
              y={circles.slice(0, spatialGroups.length).reduce((s, c) => s + c.y, 0) / spatialGroups.length}
              textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={600} fill="#333"
            >
              {stats.overlapCount.toLocaleString()}
            </text>
          )}
        </svg>
      </div>
      {/* Stats below diagram */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: '#666', marginTop: 4 }}>
        {allGroups.map((g) => {
          const count = g.id === CUSTOM_GROUP_ID ? customGroupCount : g.indices.length
          const pct = totalCells > 0 ? ((count / totalCells) * 100).toFixed(1) : '0.0'
          return (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: `rgb(${g.color.join(',')})`, fontWeight: 600 }}>
                {g.id === ALL_CELLS_GROUP_ID ? 'All Cells' : g.id === CUSTOM_GROUP_ID ? 'Custom' : `Group ${g.id}`}
              </span>
              <span>
                <span style={{ fontWeight: 500, color: '#333' }}>{count.toLocaleString()}</span>
                {' '}cells ({pct}%)
              </span>
            </div>
          )
        })}
        {groups.length > 1 && (
          <>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>Overlap</span>
              <span>
                <span style={{ fontWeight: 500, color: '#333' }}>{stats.overlapCount.toLocaleString()}</span>
                {' '}cells
              </span>
            </div>
            {stats.unionCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Jaccard</span>
                <span style={{ fontWeight: 500, color: '#333' }}>
                  {(stats.overlapCount / stats.unionCount * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function GroupOverview({ groups, totalCells }: GroupOverviewProps) {
  const customGroupEnabledIds = useAppStore((s) => s.customGroupEnabledIds)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)

  // Compute custom group count from index map (indices field is empty for perf)
  const customGroupCount = useMemo(() => {
    let count = 0
    for (const id of customGroupEnabledIds) {
      const arr = customGroupIndexMap[id]
      if (arr) count += arr.length
    }
    return count
  }, [customGroupEnabledIds, customGroupIndexMap])

  const activeGroups = useMemo(
    () => groups.filter((g) =>
      g.id === CUSTOM_GROUP_ID ? customGroupCount > 0 : g.indices.length > 0
    ),
    [groups, customGroupCount],
  )

  // Overlap stats only from spatial groups
  const spatialActiveGroups = useMemo(
    () => activeGroups.filter((g) => g.id !== CUSTOM_GROUP_ID),
    [activeGroups],
  )

  const stats = useMemo(
    () => computeOverlap(spatialActiveGroups, totalCells),
    [spatialActiveGroups, totalCells],
  )

  return (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text strong style={{ fontSize: 12 }}>Groups</Typography.Text>
      {(spatialActiveGroups.length > 0 || customGroupCount > 0) && (
        <VennDiagram groups={activeGroups} stats={stats} totalCells={totalCells} customGroupCount={customGroupCount} />
      )}
      <CustomGroupPanel />
    </div>
  )
}
