import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Layout, Tabs, Typography, Spin, message, notification } from 'antd'
import { BgColorsOutlined, DatabaseOutlined, DotChartOutlined, HolderOutlined, LeftOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import { PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { CollisionFilterExtension, DataFilterExtension } from '@deck.gl/extensions'
import { _StatsWidget as StatsWidget } from '@deck.gl/widgets'
import { ProfileBar, PROFILE_BAR_HEIGHT, saveProfileSession } from '@cbioportal-cell-explorer/profiler'
import useAppStore from '../store/useAppStore'
import type { SpatialSelectionGroup } from '../store/useAppStore'
import { usePostMessage } from '../config/usePostMessage'
import { parseConfig } from '../config/parseConfig'
import { applyConfig } from '../config/applyConfig'
import { DatasetStatus } from '../components/DatasetStatus'
import { applyErrorMessage } from '../config/applyResult'
import type { AppConfig } from '../config/schema'
import UserAvatar from '../components/UserAvatar'
import ColorBySection from '../components/ColorBySection'
import { ControlsPanel } from '../components/ControlsPanel'
import SelectionOverlay from '../components/SelectionOverlay'
import SelectionToolbar from '../components/SelectionToolbar'
import SummaryPanel from '../components/SummaryPanel'
import { ChatPanel } from '../chat/ChatPanel'
import AttributionCredit from '../components/AttributionCredit'
import { loadDatasets, saveDatasets } from '../utils/datasets'
import { fitZoom, insetTarget, recallViewState, rememberViewState } from '../utils/viewport'

const { Sider, Content } = Layout

const LEFT_SIDEBAR_WIDTH = 300
const RIGHT_SIDEBAR_WIDTH = 400
const SIDEBAR_COLLAPSED_WIDTH = 60
// Snap breakpoints for the right sidebar — drag releases snap to nearest
const RIGHT_SNAP_POINTS = [SIDEBAR_COLLAPSED_WIDTH, 300, RIGHT_SIDEBAR_WIDTH, 550, 700, 800]

function snapToNearest(value: number): number {
  let closest = RIGHT_SNAP_POINTS[0]
  let minDist = Math.abs(value - closest)
  for (let i = 1; i < RIGHT_SNAP_POINTS.length; i++) {
    const dist = Math.abs(value - RIGHT_SNAP_POINTS[i])
    if (dist < minDist) { closest = RIGHT_SNAP_POINTS[i]; minDist = dist }
  }
  return closest
}

function useRightSidebarDrag(onDragEnd: (snapped: number) => void) {
  const currentSnapped = useRef(RIGHT_SIDEBAR_WIDTH)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const setSnappedRef = useCallback((w: number) => { currentSnapped.current = w }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = currentSnapped.current
    let latestWidth = startWidth
    let lastSnap = snapToNearest(startWidth)

    // Ghost line follows cursor
    const ghost = document.createElement('div')
    Object.assign(ghost.style, {
      position: 'fixed',
      top: '0',
      width: '2px',
      height: '100vh',
      background: '#1677ff',
      opacity: '0.4',
      zIndex: '9999',
      pointerEvents: 'none',
      left: `${e.clientX}px`,
    })

    // Shaded snap region — anchored to right edge, width = snap target
    const snapRegion = document.createElement('div')
    Object.assign(snapRegion.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: `${lastSnap}px`,
      height: '100vh',
      background: '#1677ff',
      opacity: '0.06',
      zIndex: '9998',
      pointerEvents: 'none',
      transition: 'width 150ms ease',
      borderLeft: '2px solid rgba(22, 119, 255, 0.3)',
    })

    document.body.appendChild(snapRegion)
    document.body.appendChild(ghost)
    ghostRef.current = ghost

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      latestWidth = Math.max(0, startWidth + delta)
      ghost.style.left = `${ev.clientX}px`

      const snap = snapToNearest(latestWidth)
      if (snap !== lastSnap) {
        lastSnap = snap
        snapRegion.style.width = `${snap}px`
      }
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      ghost.remove()
      snapRegion.remove()
      ghostRef.current = null
      onDragEnd(snapToNearest(latestWidth))
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [onDragEnd])

  return { onMouseDown, setSnappedRef }
}

const ENABLE_STATS_WIDGET = import.meta.env.VITE_ENABLE_STATS_WIDGET === 'true'
const ENABLE_PROFILER = import.meta.env.VITE_ENABLE_PROFILER === 'true'

const WIDGETS = ENABLE_STATS_WIDGET
  ? [new StatsWidget({ type: 'deck', framesPerUpdate: 5, placement: 'bottom-left' })]
  : []

// Fallback color when no color buffer is ready yet
const FALLBACK_COLOR: [number, number, number, number] = [200, 200, 200, 128]

const DIM_ALPHA = 77 // ~30% opacity for unselected points in dim mode
const SELECTED_ALPHA = 255 // full opacity for selected points

function dimColorBuffer(colorBuffer: Uint8Array, filterBuffer: Float32Array): Uint8Array {
  const out = new Uint8Array(colorBuffer.length)
  out.set(colorBuffer)
  const numPoints = filterBuffer.length
  for (let i = 0; i < numPoints; i++) {
    if (filterBuffer[i] === 0) {
      out[i * 4 + 3] = DIM_ALPHA
    } else {
      out[i * 4 + 3] = SELECTED_ALPHA
    }
  }
  return out
}

const collapsedIconStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#999',
  padding: '12px 0',
  display: 'flex',
  justifyContent: 'center',
}

function CollapsedAuthIcon() {
  return (
    <div style={{ ...collapsedIconStyle, paddingBottom: 12 }}>
      <UserAvatar />
    </div>
  )
}

function CollapsedSidebar({ onExpand }: { onExpand: () => void }) {
  return (
    <div onClick={onExpand} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', paddingTop: 12 }}>
      <Link to="/" style={{ textDecoration: 'none', marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
        <Typography.Text strong style={{ fontSize: 11 }}>CCE</Typography.Text>
      </Link>
      <div style={collapsedIconStyle}><DatabaseOutlined /></div>
      <div style={collapsedIconStyle}><DotChartOutlined /></div>
      <div style={collapsedIconStyle}><BgColorsOutlined /></div>
      <div style={{ flex: 1 }} />
      <div style={{ ...collapsedIconStyle, borderTop: '1px solid #f0f0f0', width: '100%' }}><SettingOutlined /></div>
      <CollapsedAuthIcon />
    </div>
  )
}

function CanvasLoadingOverlay() {
  const embeddingLoading = useAppStore((s) => s.embeddingLoading)
  const colorBufferLoading = useAppStore((s) => s.colorBufferLoading)

  const loadingMessage = embeddingLoading
    ? 'Loading embedding…'
    : colorBufferLoading
      ? 'Updating colors…'
      : null

  if (!loadingMessage) return null

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, textAlign: 'center' }}>
      <Spin />
      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>{loadingMessage}</div>
    </div>
  )
}

function FilterBanner() {
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const selectionGroups = useAppStore((s) => s.selectionGroups)
  const embeddingData = useAppStore((s) => s.embeddingData)
  const customGroupColumn = useAppStore((s) => s.customGroupColumn)
  const customGroupCommittedCount = useAppStore((s) => s.customGroupCommittedCount)
  const customGroupIndexMap = useAppStore((s) => s.customGroupIndexMap)

  const totalCells = embeddingData?.numPoints ?? 0
  const hasCustomGroup = customGroupColumn !== null

  // Show banner when custom group exists with no committed IDs
  if (hasCustomGroup && customGroupCommittedCount === 0) {
    return (
      <div style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '4px 12px',
        borderRadius: 4,
        fontSize: 11,
        pointerEvents: 'none',
      }}>
        No IDs committed — showing all {totalCells.toLocaleString()} cells
      </div>
    )
  }

  if (selectionDisplayMode !== 'hide') return null

  // Count visible cells from spatial groups + committed custom group count
  let totalVisible = 0
  let groupCount = 0
  for (const g of selectionGroups) {
    if (g.type === 'custom') {
      if (customGroupCommittedCount > 0) { totalVisible += customGroupCommittedCount; groupCount++ }
    } else if (g.indices.length > 0) {
      totalVisible += g.indices.length
      groupCount++
    }
  }

  if (groupCount === 0) return null
  const totalIds = Object.keys(customGroupIndexMap).length

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2,
      background: 'rgba(0, 0, 0, 0.7)',
      color: '#fff',
      padding: '4px 12px',
      borderRadius: 4,
      fontSize: 11,
      pointerEvents: 'none',
    }}>
      {hasCustomGroup && totalIds > 0 && (() => {
        const cg = selectionGroups.find((g) => g.type === 'custom')
        const enabledCount = cg && 'ids' in cg ? cg.ids.length : 0
        return `${enabledCount}/${totalIds} IDs · `
      })()}{totalVisible.toLocaleString()} of {totalCells.toLocaleString()} cells
    </div>
  )
}

function Visualization({ deckRef }: { deckRef: React.RefObject<DeckGL | null> }) {
  const embeddingData = useAppStore((s) => s.embeddingData)
  const colorBuffer = useAppStore((s) => s.colorBuffer)
  const radiusBuffer = useAppStore((s) => s.radiusBuffer)
  const pointRadius = useAppStore((s) => s.pointRadius)
  const antialiasing = useAppStore((s) => s.antialiasing)
  const collisionEnabled = useAppStore((s) => s.collisionEnabled)
  const collisionRadiusScale = useAppStore((s) => s.collisionRadiusScale)
  const selectionFilterBuffer = useAppStore((s) => s.selectionFilterBuffer)
  const selectionDisplayMode = useAppStore((s) => s.selectionDisplayMode)
  const selectionGroups = useAppStore((s) => s.selectionGroups)
  const selectionTool = useAppStore((s) => s.selectionTool)
  const pendingViewport = useAppStore((s) => s.pendingViewport)
  const setViewport = useAppStore((s) => s.setViewport)
  const viewportEpoch = useAppStore((s) => s.viewportEpoch)
  const showCategoryLabels = useAppStore((s) => s.showCategoryLabels)
  const categoryCentroids = useAppStore((s) => s.categoryCentroids)
  const ensureCategoryCentroids = useAppStore((s) => s.ensureCategoryCentroids)
  const categoryMap = useAppStore((s) => s.categoryMap)
  const highlightedCategories = useAppStore((s) => s.highlightedCategories)
  const selectedEmbedding = useAppStore((s) => s.selectedEmbedding)
  const colorMode = useAppStore((s) => s.colorMode)
  const selectedObsColumn = useAppStore((s) => s.selectedObsColumn)
  const categoryLabelsObsColumn = useAppStore((s) => s.categoryLabelsObsColumn)

  // The column we render labels for. Decoupled from color mode: explicit
  // override wins; null falls back to selectedObsColumn but only when the
  // user is actually coloring by a category. In gene mode without an
  // explicit override, no labels render — the ColorBySection hint guides
  // the user to pick a column.
  const effectiveLabelColumn =
    !showCategoryLabels
      ? null
      : (categoryLabelsObsColumn ?? (colorMode === 'category' ? selectedObsColumn : null))

  // Subscribe to the label column's obs data so the centroid-dispatch effect
  // re-fires once it lands (addSummaryObsColumn / selectObsColumn populate
  // summaryObsData async; without this dep, the centroid dispatch misses
  // the first-load window for a new column).
  const labelColumnObsData = useAppStore((s) =>
    effectiveLabelColumn ? s.summaryObsData.get(effectiveLabelColumn) : undefined,
  )

  // True when labels and the color buffer share an obs column. Used to
  // decide which categoryMap to use for label text/color AND whether
  // category highlights apply to label filtering.
  const labelMatchesColorColumn =
    colorMode === 'category' && selectedObsColumn === effectiveLabelColumn

  const containerRef = useRef<HTMLDivElement>(null)

  // Derive initial view state from data bounds + container size.
  // If a pendingViewport was set via applyConfig, override target+zoom with it.
  const initialViewState = useMemo(() => {
    if (!embeddingData?.bounds) return { target: [0, 0, 0] as [number, number, number], zoom: 1 }

    const { minX, maxX, minY, maxY } = embeddingData.bounds
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Use container dimensions if available, otherwise a reasonable default
    const el = containerRef.current
    const viewWidth = el?.clientWidth || 800
    const viewHeight = el?.clientHeight || 600
    // Space covered by an overlay at the bottom (the phone chat sheet). Read,
    // not subscribed: it only matters when a view is computed.
    const inset = useAppStore.getState().plotBottomInset

    const zoom = fitZoom(embeddingData.bounds, viewWidth, Math.max(1, viewHeight - inset))

    const minZoom = zoom - 0.25
    const maxZoom = zoom + 4

    if (pendingViewport) {
      const [x, y] = insetTarget(pendingViewport.target, pendingViewport.zoom, inset)
      return { target: [x, y, 0] as [number, number, number], zoom: pendingViewport.zoom, minZoom, maxZoom }
    }

    // A remount on the same embedding (the page switching between its narrow
    // and wide layouts) keeps the camera where the user left it.
    const recalled = recallViewState(embeddingData)
    if (recalled) return { ...recalled, minZoom, maxZoom }

    const [x, y] = insetTarget([centerX, centerY], zoom, inset)
    return { target: [x, y, 0] as [number, number, number], zoom, minZoom, maxZoom }
  }, [embeddingData, pendingViewport])

  // Imperative viewport reset for runtime updates.
  //
  // deck.gl's `initialViewState` is only consumed at first mount; after that,
  // the controller manages viewState internally. To apply a programmatic
  // viewport change at runtime (e.g. agent calls set_viewport after the canvas
  // is already drawn), we use the prescribed pattern: deckRef.current.setProps
  // with a `viewState` object. This switches deck.gl to controlled mode; an
  // onViewStateChange handler below keeps it in sync as the user pans/zooms.
  //
  // The didMount + viewportEpoch idiom skips the first effect run (the
  // initial mount, which initialViewState handles) and fires only on
  // subsequent setViewport calls.
  const isControlledRef = useRef(false)
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }
    // @deck.gl/react v9 exposes the underlying Deck instance on the ref as
    // `.deck`. The React component itself doesn't have setProps — calling it
    // directly errors with "setProps is not a function".
    const deck = deckRef.current?.deck
    if (!deck || !embeddingData?.bounds) return

    // Compute target viewState. If pendingViewport is null (reset request),
    // fall back to fit-to-view from bounds + container size.
    // Fit into the area left visible above a bottom overlay (the phone chat
    // sheet); read, not subscribed.
    const inset = useAppStore.getState().plotBottomInset
    let center: [number, number]
    let zoom: number
    if (pendingViewport) {
      center = pendingViewport.target
      zoom = pendingViewport.zoom
    } else {
      const { minX, maxX, minY, maxY } = embeddingData.bounds
      const el = containerRef.current
      const viewWidth = el?.clientWidth || 800
      const viewHeight = el?.clientHeight || 600
      center = [(minX + maxX) / 2, (minY + maxY) / 2]
      zoom = fitZoom(embeddingData.bounds, viewWidth, Math.max(1, viewHeight - inset))
    }
    const [x, y] = insetTarget(center, zoom, inset)
    const target: [number, number, number] = [x, y, 0]
    isControlledRef.current = true
    deck.setProps({ viewState: { target, zoom } })
    // Clear pendingViewport without bumping epoch (use setState bypass).
    if (pendingViewport) {
      useAppStore.setState({ pendingViewport: null })
    }
  }, [viewportEpoch, embeddingData, pendingViewport])

  // Pan/zoom handler — only matters once deck.gl is in controlled mode.
  // Uses ref-based tracking (no React state) per the perf rule.
  const onViewStateChange = useCallback(
    ({ viewState }: { viewState: Record<string, unknown> }) => {
      const current = useAppStore.getState().embeddingData
      if (current) rememberViewState(current, viewState as { target: [number, number, number]; zoom: number })
      const deck = deckRef.current?.deck
      if (isControlledRef.current && deck) {
        deck.setProps({ viewState })
      }
    },
    [deckRef],
  )

  // Memoize layer data object — only recreate when position or color buffer changes
  const layerData = useMemo(() => {
    if (!embeddingData) return null
    const attributes: Record<string, { value: Float32Array | Uint8Array; size: number; normalized?: boolean }> = {
      getPosition: { value: embeddingData.positions, size: 2 },
    }

    // Apply selection dimming by modifying color buffer alpha
    const hasSelection = selectionFilterBuffer !== null
    const effectiveColor = colorBuffer && hasSelection && selectionDisplayMode === 'dim'
      ? dimColorBuffer(colorBuffer, selectionFilterBuffer)
      : colorBuffer

    if (effectiveColor) {
      attributes.getFillColor = { value: effectiveColor, size: 4, normalized: true }
    }

    if (radiusBuffer) {
      attributes.getRadius = { value: radiusBuffer, size: 1 }
    }
    return { length: embeddingData.numPoints, attributes }
  }, [embeddingData, colorBuffer, radiusBuffer, selectionFilterBuffer, selectionDisplayMode])

  // Key forces deck.gl to re-initialize when view state changes (new embedding)
  const deckKey = useMemo(
    () => embeddingData ? `${embeddingData.bounds.minX}-${embeddingData.bounds.maxX}` : 'empty',
    [embeddingData],
  )

  // deckKey is a dependency even though the body never reads it: a new key
  // remounts DeckGL with a fresh WebGL context, and a layer instance already
  // initialized in the old context fails deck.gl's init assertion and draws
  // with destroyed programs. The label layer can be built before the new
  // embedding's positions arrive (its centroids may be cached), so without
  // this it would be carried across the remount.
  const categoryLabelLayer = useMemo(() => {
    if (!effectiveLabelColumn) return null
    const cache = categoryCentroids.get(`${selectedEmbedding}::${effectiveLabelColumn}`)
    if (!cache) return null

    // When labeling by the SAME column we're coloring by, use the categoryMap
    // already loaded for the color buffer. When labeling by a DIFFERENT column,
    // pull labels + colors from summaryObsData (populated by addSummaryObsColumn
    // which the setter calls).
    const labelMap = labelMatchesColorColumn
      ? categoryMap
      : (labelColumnObsData?.categoryMap ?? [])
    if (labelMap.length === 0) return null

    // Highlights only apply when labeling by the column we're coloring by —
    // the highlightedCategories codes refer to the color column's categoryMap.
    const visibleCodes =
      labelMatchesColorColumn && highlightedCategories.size > 0
        ? Array.from(highlightedCategories)
        : labelMap.map((_, i) => i)

    const labels = visibleCodes
      .filter((code) => cache.counts[code] > 0)
      .map((code) => ({
        text: labelMap[code]?.label ?? '',
        position: [cache.positions[2 * code], cache.positions[2 * code + 1]] as [number, number],
        color: labelMap[code]?.color ?? ([255, 255, 255] as [number, number, number]),
      }))

    if (labels.length === 0) return null

    return new TextLayer({
      id: 'category-labels',
      data: labels,
      getPosition: (d: { position: [number, number] }) => d.position,
      getText: (d: { text: string }) => d.text,
      getColor: (d: { color: [number, number, number] }) =>
        [...d.color, 230] as [number, number, number, number],
      getSize: 14,
      sizeUnits: 'pixels' as const,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 600,
      background: true,
      backgroundPadding: [4, 2],
      getBackgroundColor: [0, 0, 0, 180],
      outlineWidth: 0,
    })
  }, [
    effectiveLabelColumn,
    labelMatchesColorColumn,
    selectedEmbedding,
    categoryCentroids,
    highlightedCategories,
    categoryMap,
    labelColumnObsData,
    deckKey,
  ])

  const layers = useMemo(() => {
    if (!layerData) return []

    const hasSelection = selectionFilterBuffer !== null
    const hideMode = hasSelection && selectionDisplayMode === 'hide'

    const scatterplot = new ScatterplotLayer({
      id: 'scatterplot',
      data: layerData,
      dataComparator: (a: unknown, b: unknown) => a === b,
      ...(!colorBuffer && { getFillColor: FALLBACK_COLOR }),
      updateTriggers: {
        getFillColor: [colorBuffer, selectionFilterBuffer, selectionDisplayMode],
        getRadius: [radiusBuffer],
        getFilterValue: [selectionFilterBuffer],
      },
      getRadius: radiusBuffer ? 1 : pointRadius,
      radiusUnits: 'pixels' as const,
      antialiasing,
      extensions: [
        new DataFilterExtension({ filterSize: 1 }),
        ...(collisionEnabled ? [new CollisionFilterExtension()] : []),
      ],
      getFilterValue: hideMode
        ? (_: unknown, { index }: { index: number }) => selectionFilterBuffer![index]
        : 1,
      filterEnabled: hideMode,
      filterRange: [1, 1] as [number, number],
      ...(collisionEnabled && {
        collisionTestProps: { radiusScale: collisionRadiusScale },
      }),
    })

    const spatialGroups = selectionGroups.filter(
      (g): g is SpatialSelectionGroup => g.type === 'rectangle' || g.type === 'lasso',
    )
    const polygonLayer = spatialGroups.length > 0
      ? new PolygonLayer({
          id: 'selection-polygons',
          data: spatialGroups,
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          getLineColor: (d: { color: [number, number, number] }) => [...d.color, 200],
          getLineWidth: 2,
          filled: false,
          stroked: true,
          lineWidthUnits: 'pixels' as const,
        })
      : null

    const layers = [scatterplot] as unknown[]
    if (polygonLayer) layers.push(polygonLayer)
    if (categoryLabelLayer) layers.push(categoryLabelLayer)
    return layers
  }, [layerData, colorBuffer, radiusBuffer, pointRadius, antialiasing, collisionEnabled, collisionRadiusScale, selectionFilterBuffer, selectionDisplayMode, selectionGroups, categoryLabelLayer])

  // Reset controlled mode on embedding switch — the new deck.gl mount starts
  // uncontrolled and consumes the new initialViewState fresh.
  useEffect(() => {
    isControlledRef.current = false
    didMountRef.current = false
  }, [deckKey])

  useEffect(() => {
    if (effectiveLabelColumn && embeddingData && labelColumnObsData && selectedEmbedding) {
      ensureCategoryCentroids(selectedEmbedding, effectiveLabelColumn)
    }
  }, [
    effectiveLabelColumn,
    selectedEmbedding,
    embeddingData,
    labelColumnObsData,
    ensureCategoryCentroids,
  ])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        ref={deckRef}
        key={deckKey}
        views={new OrthographicView()}
        initialViewState={initialViewState}
        controller={selectionTool === 'pan'}
        onViewStateChange={onViewStateChange}
        layers={layers}
        widgets={WIDGETS}
      />
      <AttributionCredit />
    </div>
  )
}

const MemoizedVisualization = memo(Visualization)

const edgeTabStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  width: 16,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 10,
  color: '#999',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

function EdgeTab({ onClick, onMouseDown, side, icon, cursor }: {
  onClick?: () => void
  onMouseDown?: (e: React.MouseEvent) => void
  side: 'left' | 'right'
  icon: React.ReactNode
  cursor?: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      style={{
        ...edgeTabStyle,
        ...(side === 'left' ? { left: -9 } : { right: -9 }),
        ...(cursor && { cursor }),
      }}
    >
      {icon}
    </div>
  )
}

function ProfileBarWrapper({ onHide }: { onHide: () => void }) {
  const adata = useAppStore((s) => s.adata)
  const datasetUrl = useAppStore((s) => s.datasetUrl)

  return (
    <ProfileBar
      profiler={adata?.profiler}
      onSave={(entries: unknown[]) => {
        if (adata) saveProfileSession(datasetUrl, adata.nObs, adata.nVar, entries)
      }}
      renderLink={(children) => <Link to="/profile">{children}</Link>}
      onHide={onHide}
    />
  )
}

function View() {
  const [searchParams] = useSearchParams()
  const configParam = searchParams.get('config')
  const urlParam = searchParams.get('url')
  const datasetParam = searchParams.get('dataset')
  // Profile bar visibility — session-only, resets on reload. The bar reserves
  // bottom padding for content; when hidden we remove that padding so layout
  // reflows into the freed area.
  const [profilerHidden, setProfilerHidden] = useState(false)
  const profilerVisible = ENABLE_PROFILER && !profilerHidden
  const openDataset = useAppStore((s) => s.openDataset)
  const openCatalogDataset = useAppStore((s) => s.openCatalogDataset)
  const loadingError = useAppStore((s) => s.loadingError)
  const datasetSlug = useAppStore((s) => s.datasetSlug)
  const dataset = useAppStore((s) =>
    s.catalogDatasets.find((d) => d.slug === datasetSlug),
  )
  const backendInfo = useAppStore((s) => s.backendInfo)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightWidth, setRightWidth] = useState(RIGHT_SIDEBAR_WIDTH)
  const deckRef = useRef<DeckGL>(null)

  // PostMessage listener for iframe embedding (gated by env vars)
  usePostMessage()

  const { onMouseDown: onDragStart, setSnappedRef } = useRightSidebarDrag(setRightWidth)

  // Keep the drag hook's ref in sync with the current snapped width
  useEffect(() => { setSnappedRef(rightWidth) }, [rightWidth, setSnappedRef])

  const configApplied = useRef(false)

  // An error belongs to this visit. Leaving it in the store would show it for
  // a frame on the next visit, before that visit's open clears it.
  useEffect(() => () => useAppStore.setState({ loadingError: null }), [])

  // A catalog dataset is opened only once we know who the user is. The access
  // cookie is short-lived and the dataset endpoint does not refresh it, but the
  // auth check does — opening first would tell a signed-in user to sign in.
  // No backend, or auth off, means there is nothing to wait for.
  const backendProbed = useAppStore((s) => s.backendProbed)
  const authChecked = useAppStore((s) => s.authChecked)
  const readyForCatalog = backendProbed && (!backendInfo?.auth_enabled || authChecked)

  // Apply a ?config= and report what it could not apply. When the dataset
  // itself failed to open, the status page already says so; otherwise the
  // viewer is fine and only some settings were skipped, so a notice is enough.
  const applyLinkConfig = useCallback((config: AppConfig) => {
    applyConfig(config).then((result) => {
      if (!result.ok && !useAppStore.getState().loadingError) {
        notification.warning({
          message: "Some of this link's view settings couldn't be applied",
          description: applyErrorMessage(result.reason),
        })
      }
    })
  }, [])

  // Handle ?config= param (applied once on initial load)
  useEffect(() => {
    if (!configParam || configApplied.current) return
    const config = parseConfig(configParam)
    if (!config) {
      configApplied.current = true
      useAppStore.setState({ loadingError: { kind: 'config_unreadable' } })
      return
    }
    if (config.dataset && !readyForCatalog) return
    configApplied.current = true
    if (!config.showLeftSidebar) setLeftCollapsed(true)
    if (!config.showRightSidebar) setRightWidth(SIDEBAR_COLLAPSED_WIDTH)
    applyLinkConfig(config)
  }, [configParam, readyForCatalog, applyLinkConfig])

  // Handle ?dataset= param — loads dataset on initial visit
  // Skipped when ?config= was used (applyConfig handles dataset loading)
  useEffect(() => {
    if (configParam || !datasetParam || !readyForCatalog) return
    openCatalogDataset(datasetParam)
  }, [datasetParam, configParam, readyForCatalog, openCatalogDataset])

  // Handle ?url= param. A direct URL has no access rules, so it does not wait
  // for the auth check.
  useEffect(() => {
    if (configParam || datasetParam || !urlParam) return
    // Only URLs opened directly are remembered. Catalog datasets are already
    // listed by the catalog, and a private one's URL is useless without the
    // credentials `/access` grants alongside it.
    const saved = loadDatasets()
    if (!saved.includes(urlParam)) saveDatasets([urlParam, ...saved])
    openDataset(urlParam)
  }, [urlParam, datasetParam, configParam, openDataset])

  if (loadingError) {
    return (
      <DatasetStatus
        error={loadingError}
        onRetry={() => {
          // Re-run what the link describes. The resolved store URL is not
          // enough: a private dataset's URL is useless without the credentials
          // `/access` grants alongside it.
          const config = configParam ? parseConfig(configParam) : null
          if (config) applyLinkConfig(config)
          else if (datasetParam) openCatalogDataset(datasetParam)
          else if (urlParam) openDataset(urlParam)
        }}
      />
    )
  }

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <Layout style={{ flex: 1, overflow: 'hidden', paddingBottom: profilerVisible ? PROFILE_BAR_HEIGHT : 0 }}>
        <Sider
          width={LEFT_SIDEBAR_WIDTH}
          collapsible
          collapsed={leftCollapsed}
          collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
          trigger={null}
          theme="light"
          style={{ borderRight: leftCollapsed ? undefined : '1px solid #f0f0f0', overflow: 'auto', background: '#fff', transition: 'width 200ms ease' }}
        >
          {leftCollapsed ? <CollapsedSidebar onExpand={() => setLeftCollapsed(false)} /> : <ControlsPanel />}
        </Sider>
        <Content style={{ position: 'relative' }}>
          <EdgeTab
            side="left"
            onClick={() => setLeftCollapsed((c) => !c)}
            icon={leftCollapsed ? <RightOutlined /> : <LeftOutlined />}
          />
          <MemoizedVisualization deckRef={deckRef} />
          <SelectionOverlay deckRef={deckRef} />
          <SelectionToolbar />
          <FilterBanner />
          <CanvasLoadingOverlay />
          <EdgeTab
            side="right"
            onMouseDown={onDragStart}
            icon={<HolderOutlined />}
            cursor="col-resize"
          />
        </Content>
        <Sider
          width={rightWidth}
          theme="light"
          style={{ borderLeft: rightWidth <= SIDEBAR_COLLAPSED_WIDTH ? undefined : '1px solid #f0f0f0', background: '#fff', transition: 'width 200ms ease', position: 'relative' }}
        >
          {/* Drag handle — thin strip on the left edge of the right sidebar */}
          <div
            onMouseDown={onDragStart}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 4,
              height: '100%',
              cursor: 'col-resize',
              zIndex: 10,
            }}
          />
          {rightWidth <= SIDEBAR_COLLAPSED_WIDTH ? (
            <SummaryPanel collapsed onExpand={() => setRightWidth(RIGHT_SIDEBAR_WIDTH)} />
          ) : (
            <Tabs
              size="small"
              defaultActiveKey="summary"
              className="chat-tabs"
              // Inset the tab labels from the Sider's left border + drag
              // handle so "Summary" / "Chat" don't sit flush against the
              // edge. See cbioportal-cell-explorer issue for the broader
              // sidebar-gutter refactor.
              tabBarStyle={{ paddingLeft: 12, paddingRight: 8 }}
              items={[
                {
                  key: 'summary',
                  label: 'Summary',
                  children: <SummaryPanel collapsed={false} onExpand={() => {}} />,
                },
                ...(datasetSlug && backendInfo?.chat_enabled && dataset?.chat_enabled
                  ? [
                      {
                        key: 'chat',
                        label: 'Chat',
                        children: <ChatPanel slug={datasetSlug} />,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </Sider>
      </Layout>
      {profilerVisible && <ProfileBarWrapper onHide={() => setProfilerHidden(true)} />}
    </Layout>
  )
}

export default View
