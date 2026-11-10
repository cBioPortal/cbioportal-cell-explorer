export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Zoom that fits `bounds` into a `viewWidth` × `viewHeight` canvas with padding. */
export function fitZoom(bounds: Bounds, viewWidth: number, viewHeight: number, padding = 1.1): number {
  const dataWidth = bounds.maxX - bounds.minX || 1
  const dataHeight = bounds.maxY - bounds.minY || 1
  return Math.log2(Math.min(
    viewWidth / (dataWidth * padding),
    viewHeight / (dataHeight * padding),
  ))
}

/**
 * Camera target that shows `target` centred in the part of the canvas left
 * visible above an overlay `insetBottom` px tall (the chat sheet on phones).
 * OrthographicView's default flipY means screen y grows with world y, so the
 * camera moves down by half the inset, converted to world units at `zoom`.
 */
export function insetTarget(target: [number, number], zoom: number, insetBottom: number): [number, number] {
  return [target[0], target[1] + insetBottom / 2 / 2 ** zoom]
}

type ViewState = { target: [number, number, number]; zoom: number }

// The last camera, keyed by the embedding it was on. A plain module slot, not
// React or store state: it is written on every pan/zoom and only read when the
// plot remounts (e.g. the dataset page switching between its narrow and wide
// layouts), so it must not trigger renders.
let remembered: { key: object; viewState: ViewState } | null = null

export function rememberViewState(
  key: object,
  viewState: { target: [number, number] | [number, number, number]; zoom: number },
): void {
  const [x, y] = viewState.target
  remembered = { key, viewState: { target: [x, y, 0], zoom: viewState.zoom } }
}

/** The camera last remembered for `key`, or null if it was for another embedding. */
export function recallViewState(key: object): ViewState | null {
  return remembered && remembered.key === key ? remembered.viewState : null
}
