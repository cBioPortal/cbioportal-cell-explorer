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

/** A requested camera: explicit target + zoom, optionally "fit these bounds" (zoom then follows the canvas). */
export interface PendingViewport {
  target: [number, number]
  zoom: number
  fitBounds?: Bounds
}

/**
 * The camera to show for a request on a `viewWidth` × `viewHeight` canvas
 * whose bottom `inset` px are covered: fit-to-view when `pending` is null, the
 * requested target otherwise, with `fitBounds` sized to the real canvas.
 */
export function resolveViewport(
  pending: PendingViewport | null,
  dataBounds: Bounds,
  viewWidth: number,
  viewHeight: number,
  inset: number,
): { target: [number, number]; zoom: number } {
  const visibleHeight = Math.max(1, viewHeight - inset)
  let center: [number, number]
  let zoom: number
  if (!pending) {
    center = [(dataBounds.minX + dataBounds.maxX) / 2, (dataBounds.minY + dataBounds.maxY) / 2]
    zoom = fitZoom(dataBounds, viewWidth, visibleHeight)
  } else if (pending.fitBounds) {
    center = pending.target
    zoom = fitZoom(pending.fitBounds, viewWidth, visibleHeight)
  } else {
    center = pending.target
    zoom = pending.zoom
  }
  return { target: insetTarget(center, zoom, inset), zoom }
}

/** Apply a camera to deck.gl and remember it, so a remount (layout switch) keeps it. */
export function commitViewState(
  deck: { setProps: (props: { viewState: ViewState }) => void },
  key: object,
  viewState: { target: [number, number]; zoom: number },
): void {
  const vs: ViewState = { target: [viewState.target[0], viewState.target[1], 0], zoom: viewState.zoom }
  deck.setProps({ viewState: vs })
  rememberViewState(key, vs)
}

/**
 * How far the camera may move from the fit-to-view zoom: in to 256x, so a
 * dense cluster in a multi-million-cell atlas separates into cells, and out
 * to 2x, for room around the plot.
 */
export function zoomLimits(fit: number): { minZoom: number; maxZoom: number } {
  return { minZoom: fit - 1, maxZoom: fit + 8 }
}

/** deck.gl controller options: a flick keeps gliding briefly after release. */
export const PAN_CONTROLLER = { inertia: 300 }

/**
 * deck.gl `useDevicePixels`. On a touch-first device (phone, tablet) the plot
 * draws at 1x: at the screen's own 3x a phone GPU fills nine times the pixels
 * for millions of points, and panning stutters. Mouse and trackpad machines
 * keep full density. Read when the canvas renders, not subscribed.
 */
export function plotPixelRatio(): boolean | number {
  return window.matchMedia('(pointer: coarse)').matches ? 1 : true
}
