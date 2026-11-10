import { useEffect, useRef, useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { ChatPanel } from '../../chat/ChatPanel'
import SummaryPanel from '../SummaryPanel'
import { SNAP_ORDER, nearestSnap, snapAfterPlotChange, snapHeights, type SheetSnap } from './sheetSnap'

// A press that moves less than this is a tap on the handle, not a drag.
const TAP_SLOP_PX = 5

function useViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight)
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return height
}

interface ChatSheetProps {
  chatAvailable: boolean
  slug: string | null
  resumeThreadId: string | null
  onActiveThreadChange: (threadId: string | null) => void
}

/**
 * The narrow layout's chat: a sheet over the bottom of the plot that rests at
 * peek, half or full height. Drag the handle to resize it, or tap it to step
 * through the heights. Its height is published as the plot's bottom inset so
 * zooms land in the part of the plot still visible. When chat isn't available
 * for this dataset it holds the Summary panel instead.
 */
export function ChatSheet({ chatAvailable, slug, resumeThreadId, onActiveThreadChange }: ChatSheetProps) {
  const viewportHeight = useViewportHeight()
  const heights = snapHeights(viewportHeight)
  const [snap, setSnap] = useState<SheetSnap>('peek')
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const height = dragHeight ?? heights[snap]

  // The resting height, not the live drag height: the plot re-fits only when
  // the sheet settles.
  const restingHeight = heights[snap]
  const setPlotBottomInset = useAppStore((s) => s.setPlotBottomInset)
  useEffect(() => { setPlotBottomInset(restingHeight) }, [restingHeight, setPlotBottomInset])
  useEffect(() => () => setPlotBottomInset(0), [setPlotBottomInset])

  // Step aside when the agent changes the plot (skip the value we mounted with).
  const plotChangeEpoch = useAppStore((s) => s.plotChangeEpoch)
  const seenEpoch = useRef(plotChangeEpoch)
  useEffect(() => {
    if (plotChangeEpoch === seenEpoch.current) return
    seenEpoch.current = plotChangeEpoch
    setSnap(snapAfterPlotChange)
  }, [plotChangeEpoch])

  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startHeight: heights[snap], moved: false }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = d.startY - e.clientY
    if (!d.moved && Math.abs(dy) < TAP_SLOP_PX) return
    d.moved = true
    setDragHeight(Math.min(heights.full, Math.max(heights.peek, d.startHeight + dy)))
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    suppressClick.current = true
    setSnap(nearestSnap(dragHeight ?? heights[snap], heights))
    setDragHeight(null)
  }
  const onHandleClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return }
    setSnap((s) => SNAP_ORDER[(SNAP_ORDER.indexOf(s) + 1) % SNAP_ORDER.length])
  }

  // Typing in a peeking sheet: make room above the keyboard.
  const onFocusCapture = (e: React.FocusEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if ((tag === 'TEXTAREA' || tag === 'INPUT') && snap === 'peek') setSnap('half')
  }

  return (
    <div
      data-testid="chat-sheet"
      onFocusCapture={onFocusCapture}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.14)',
        transition: dragHeight === null ? 'height 200ms ease' : undefined,
      }}
    >
      <button
        type="button"
        aria-label="Resize chat"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onHandleClick}
        style={{ flex: 'none', height: 20, border: 0, background: 'transparent', cursor: 'grab', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ width: 36, height: 4, borderRadius: 2, background: '#c9d3dd' }} />
      </button>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {chatAvailable && slug ? (
          <ChatPanel slug={slug} startIn="new" resumeThreadId={resumeThreadId} onActiveThreadChange={onActiveThreadChange} />
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <SummaryPanel alwaysOpen collapsed={false} onExpand={() => {}} />
          </div>
        )}
      </div>
    </div>
  )
}
