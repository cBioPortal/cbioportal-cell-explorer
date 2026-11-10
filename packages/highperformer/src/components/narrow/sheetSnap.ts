/** The chat sheet's resting heights on narrow screens. */
export type SheetSnap = 'peek' | 'half' | 'full'

/** Height of the narrow layout's top bar; a full sheet stops just below it. */
export const TOP_BAR_HEIGHT = 48

const PEEK_HEIGHT = 168

export const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

export function snapHeights(viewportHeight: number): Record<SheetSnap, number> {
  return {
    peek: PEEK_HEIGHT,
    half: Math.round(viewportHeight / 2),
    full: viewportHeight - TOP_BAR_HEIGHT,
  }
}

/** The resting height closest to where a drag let go. */
export function nearestSnap(heightPx: number, heights: Record<SheetSnap, number>): SheetSnap {
  return SNAP_ORDER.reduce((best, snap) =>
    Math.abs(heights[snap] - heightPx) < Math.abs(heights[best] - heightPx) ? snap : best,
  )
}

/** When the agent changes the plot, a full sheet steps down so the change can be seen; lower ones stay. */
export function snapAfterPlotChange(current: SheetSnap): SheetSnap {
  return current === 'full' ? 'half' : current
}
