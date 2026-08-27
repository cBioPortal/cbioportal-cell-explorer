# highperformer — Architecture

High-performance single-cell embedding viewer targeting 10M+ points. Built on deck.gl with an
OrthographicView (2D, no map), Zustand for state, and Web Workers for all off-main-thread
computation.

---

## 1. Zero-Copy Binary Pipeline

Typed arrays flow from zarrita → Zustand store → deck.gl GPU attributes without any intermediate
conversion to JS objects. The critical invariant is that **a new reference to the same data
must not cause deck.gl to re-upload to the GPU** — layer `dataComparator` and `updateTriggers`
enforce this.

**Position buffer.** `fetchEmbedding` receives an `ArrayResult` from `AnnDataStore.obsm()`. If
the result is already `Float32Array` it is used as-is; otherwise it is converted exactly once
(`new Float32Array(result.data)`). WebGL has no native float16 vertex attribute, so Float16 from
zarr must be widened here. The buffer is stored directly in the Zustand `EmbeddingData` interface:

```ts
export interface EmbeddingData {
  positions: Float32Array   // interleaved x,y — length = numPoints * 2
  numPoints: number
  bounds: EmbeddingBounds
}
```

**Color buffer.** A `Uint8Array` of length `numPoints * 4` (RGBA per point) is built in a worker
and transferred back to main thread (see §2). deck.gl receives it as a binary attribute:

```ts
// Inside layerData useMemo in Visualization
attributes: {
  getPosition: { value: embeddingData.positions, size: 2 },
  getFillColor: { value: colorBuffer, size: 4, normalized: true },
}
```

`normalized: true` tells deck.gl to interpret the `Uint8Array` values as [0, 1] floats in the
shader, matching GLSL's `vec4` color convention.

**Key files:** `store/useAppStore.ts` (`EmbeddingData` interface, `fetchEmbedding`,
`rebuildColorBuffer`), `pages/View.tsx` (`layerData` useMemo inside `Visualization`).

### Binary Pipeline vs JS Objects — Practical Examples

The following examples show how our binary pipeline works compared to the conventional JS object
approach. At 10M points, the difference is the gap between smooth interaction and an unusable app.

**Example 1: Positions (embedding coordinates)**

zarrita returns a contiguous `Float32Array` from the zarr store. We pass it straight through to
deck.gl — the same object reference that zarrita produces is the one the GPU reads:

```ts
// zarrita returns: { data: Float32Array([x1, y1, x2, y2, ...]), shape: [10000000, 2] }

// Store holds the raw buffer — same reference, no copy
embeddingData = {
  positions: float32Array,
  numPoints: 10_000_000,
  bounds: { minX, maxX, minY, maxY },
}

// deck.gl receives it as a binary attribute — direct GPU upload
data: {
  length: embeddingData.numPoints,
  attributes: {
    getPosition: { value: embeddingData.positions, size: 2 },
  },
}
```

With JS objects, you'd allocate 10M objects + 10M inner arrays and deck.gl would call an accessor
function 10M times to build the GPU buffer:

```ts
// 10M objects + 10M [x, y] arrays — ~1.2 GB heap (vs 80 MB for Float32Array)
const points = []
for (let i = 0; i < 10_000_000; i++) {
  points.push({
    position: [float32Array[i * 2], float32Array[i * 2 + 1]],
  })
}

// deck.gl iterates every object through an accessor
data: points,
getPosition: d => d.position,
```

**Example 2: Color buffer (built in a worker, transferred back)**

A worker builds a `Uint8Array` RGBA buffer and transfers it to the main thread. The transfer is
instant (pointer handoff, not a copy). deck.gl uses the same buffer directly:

```ts
// colorBuffer.handler.ts (runs in worker)
const buf = new Uint8Array(numPoints * 4)       // 40 MB for 10M points
for (let i = 0; i < numPoints; i++) {
  const t = (expression[i] - min) / range
  const [r, g, b] = interpolateColorScale(t, scale)
  buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = alpha
}
// Transfer back — zero-copy, buffer ownership moves to main thread
postMessage({ buffer: buf }, [buf.buffer])

// Main thread stores it, deck.gl uses the same Uint8Array reference
set({ colorBuffer: response.buffer })

attributes: {
  getFillColor: { value: colorBuffer, size: 4, normalized: true },
}
```

With JS objects, `postMessage` would structured-clone 10M objects (takes seconds and doubles
memory), and deck.gl would call an accessor 10M times:

```ts
// Worker builds color objects
const colors = []
for (let i = 0; i < 10_000_000; i++) {
  colors.push({ r, g, b, a: alpha })
}
// Structured clone copies every object (~2-3 seconds)
postMessage({ colors })

// deck.gl calls accessor 10M times
getFillColor: d => [d.color.r, d.color.g, d.color.b, d.color.a],
```

**Example 3: Selection filter (GPU-side filtering)**

We build a `Float32Array` mask and let deck.gl's `DataFilterExtension` filter on the GPU. The
full 10M-point dataset stays in the GPU buffer — unselected points are skipped by the shader:

```ts
// Build a 0/1 mask from hit-test results
const buf = new Float32Array(numPoints)  // all 0s
for (const group of selectionGroups) {
  for (let i = 0; i < group.indices.length; i++) {
    buf[group.indices[i]] = 1  // mark selected
  }
}

// GPU filters — positions and colors never re-uploaded
extensions: [new DataFilterExtension({ filterSize: 1 })],
getFilterValue: (_, { index }) => selectionFilterBuffer[index],
filterRange: [1, 1],  // only render points where value === 1
```

With JS objects, you'd rebuild and re-upload the entire dataset every time the selection changes:

```ts
// Rebuild data array with only selected points
const filteredPoints = points.filter((_, i) => selectedIndices.has(i))

// Re-upload ALL data to GPU (positions + colors) for the subset
data: filteredPoints,
getPosition: d => d.position,
getFillColor: d => d.color,
```

**Cost comparison at 10M points:**

| | JS objects | Binary pipeline |
|---|---|---|
| Position data | ~1.2 GB (objects + arrays) | 80 MB (Float32Array) |
| Color data | ~960 MB + clone cost | 40 MB, zero-copy transfer |
| Selection filter | Rebuild + re-upload all data | Swap 40 MB mask, GPU filters |
| deck.gl setup | 10M accessor calls | Direct buffer upload |
| Worker → main thread | Structured clone (seconds) | Transfer (instant) |

---

## 2. Worker Pool with Transferables

A singleton `WorkerPool` owns `navigator.hardwareConcurrency - 1` workers (minimum 1), all
running `universal.worker.ts`. The pool is created lazily on first use:

```ts
let pool: WorkerPool | null = null
export function getPool(): WorkerPool {
  if (!pool) pool = new WorkerPool(() => new UniversalWorker())
  return pool
}
```

**Dispatch protocol.** `WorkerPool.dispatch<T>(message, transferables?)` returns a `Promise<T>`.
An internal `_poolTaskId` is injected into every message and stripped from the response; this lets
multiple in-flight tasks share the same worker's `onmessage` handler without mixing up responses.
If all workers are busy, tasks queue and drain automatically as workers become free.

**Transferables — zero-copy in both directions.** Large typed arrays are transferred, not cloned.
The worker receives the buffer, processes it, and transfers the result back:

```ts
// In universal.worker.ts — color buffer response
workerSelf.postMessage(
  { ...response, _poolTaskId },
  [response.buffer.buffer],   // transfers the Uint8Array's ArrayBuffer
)
```

After transfer the sender's `ArrayBuffer` becomes detached (zero-byte). Callers must not reuse
transferred buffers.

**Queue clearing.** When a selection is cleared, `pool.clearQueue()` resolves queued tasks with
empty objects and discards them. In-flight tasks on workers continue, but their results are
discarded by version checks (§4). This prevents expensive structured-clone `postMessage` calls
for work that is already stale.

**Task routing.** `universal.worker.ts` validates the incoming message with Zod schemas and
dispatches to one of three handler modules:

| Message type | Handler | Transferables returned |
|---|---|---|
| `buildDefault` / `buildFromCategories` / `buildFromExpression` | `colorBuffer.handler.ts` | `Uint8Array` buffer |
| `pointsInPolygon` | `selection.handler.ts` | `Uint32Array` indices |
| `summarizeCategory` / `summarizeExpression` / `summarizeExpressionByCategory` | `summary.handler.ts` | `Uint32Array` / `Float32Array` results |

**Key files:** `pool/WorkerPool.ts`, `workers/universal.worker.ts`,
`workers/colorBuffer.handler.ts`, `workers/selection.handler.ts`, `workers/summary.handler.ts`.

---

## 3. Render Stability via Zustand Selectors

Every selector in `Visualization` extracts a single primitive or a stable object reference:

```ts
const embeddingData = useAppStore((s) => s.embeddingData)
const colorBuffer   = useAppStore((s) => s.colorBuffer)
const pointRadius   = useAppStore((s) => s.pointRadius)
// ...one primitive or stable ref per call
```

Zustand uses `Object.is` comparison by default. Because the store never mutates typed arrays
in-place — it always replaces `embeddingData` or `colorBuffer` with a new reference — components
re-render exactly when the data changes and never otherwise.

`Visualization` is wrapped in `React.memo`:

```ts
const MemoizedVisualization = memo(Visualization)
```

`Visualization` receives a single prop (`deckRef`). `memo` performs a shallow comparison on
that one ref each time `View` re-renders due to sidebar state changes. Because the ref is stable,
`memo` bails out before entering the function body, skipping all selector calls and `useMemo`
evaluations entirely.

**Two-level layer memoization.** `layerData` and `layers` are memoized separately so deck.gl
only re-uploads GPU data when the actual buffer reference changes:

```ts
// Recreated only when positions or color buffer changes
const layerData = useMemo(() => { /* builds binary attributes object */ }, [embeddingData, colorBuffer, ...])

// Recreated only when layerData or render props change
const layers = useMemo(() => [new ScatterplotLayer({ data: layerData, ... })], [layerData, pointRadius, ...])
```

deck.gl's `dataComparator: (a, b) => a === b` on the ScatterplotLayer ensures that a new
`layerData` object with the same buffer references doesn't trigger a GPU re-upload.

**Key file:** `pages/View.tsx`.

---

## 4. Version Counters for Stale Response Protection

Both color buffer builds and selection hit-tests use a module-level integer version counter.
The counter increments on dispatch; the response is discarded if the counter has since advanced.

```ts
// useAppStore.ts
let colorBuildVersion = 0

// On dispatch:
colorBuildVersion++
const version = colorBuildVersion
getPool().dispatch(message).then((response) => {
  if (version !== colorBuildVersion) return  // stale — discard
  set({ colorBuffer: response.buffer })
})
```

The same pattern applies to selection:

```ts
let selectionVersion = 0
// ...
selectionVersion++
const version = selectionVersion
getPool().dispatch(...).then((response) => {
  get()._onSelectionResult(groupId, response.indices, version)
})

_onSelectionResult: (groupId, indices, version) => {
  if (version !== selectionVersion || !indices) return  // stale
  // ...
}
```

The version value is also passed through to the worker in the message payload and echoed back in
the response — this serves as a cross-check and enables future per-task cancellation without
changes to the pool protocol.

---

## 5. Category Encoding

String categorical columns (e.g. `cell_type`, `leiden`) are encoded as `Uint8Array` codes on
load, not stored as string arrays. `encodeCategories` performs a single-pass encoding:

```ts
// utils/categoryEncoding.ts
export function encodeCategories(values: (string | number | null)[]): CategoryEncoding {
  // Returns: { codes: Uint8Array, categoryMap: { label, color }[], uniqueCount }
}
```

Memory impact at 10M cells with 50 categories: string array ≈ 600 MB, `Uint8Array` ≈ 10 MB.
The `categoryMap` array (length = number of unique categories) stores labels and pre-assigned
colors and is used for legends. The color buffer worker receives `codes` directly — it indexes
into `CATEGORICAL_COLORS` with `categories[i] % numColors`.

Columns with more than `MAX_CATEGORIES` (1000) unique values are treated as continuous and
stored as `Float32Array` instead.

**Key file:** `utils/categoryEncoding.ts`.

---

## 6. Summary Subscriber Pattern

Summary computations (histograms, KDE, category tallies, dot-plot statistics) are driven by a
store subscriber, not by React component effects. This separates data orchestration from rendering
and prevents duplicate dispatches when multiple components mount simultaneously.

**Subscriber.** `attachSummarySubscriber` is called once after store creation in
`useAppStore.ts`. It subscribes to the store and runs on every state change:

```ts
// store/summarySubscriber.ts
store.subscribe((state, prev) => {
  const groupsChanged   = state.selectionGroups !== prev.selectionGroups
  const obsDataChanged  = state.summaryObsData  !== prev.summaryObsData
  // ...reference equality checks for each relevant slice
  if (!groupsChanged && !obsDataChanged && ...) return  // short-circuit
  // ...
})
```

Only reference-level changes to the relevant state slices trigger reconciliation. Unrelated state
updates (opacity, sidebar collapse, etc.) are skipped in O(1).

**`buildRequiredPairs`.** Computes the full set of `(variable, groupId)` pairs needed for the
current selection groups × pinned variables. The "All Cells" pseudo-group (`groupId = -1`) is
always included when a dataset is loaded:

```ts
// Pair types:
// - category:    cat:<obsColumnName>   × each group
// - expression:  expr:<geneName>       × each group
// - exprcat:     exprcat:<gene>:<obs>  × each group  (for dot plots)
```

**`reconcileSummaries`.** Diffs required pairs against the in-memory cache. Prunes entries for
variables that have been removed. Dispatches only pairs that are not already cached or in-flight:

```ts
// store/reconcileSummaries.ts
export function reconcileSummaries(
  requiredPairs: SummaryPair[],
  cache: Map<string, Map<number, unknown>>,
  dispatchFn: (pair: SummaryPair) => void,
): void { /* prune stale, dispatch missing */ }
```

**In-flight deduplication.** `summarySubscriber.ts` maintains a module-level `inFlight: Set<string>`
keyed by `"variableKey:groupId"`. A pair is not dispatched if an identical request is already in
flight, preventing duplicate work when the subscriber fires multiple times in rapid succession.

**Key files:** `store/summarySubscriber.ts`, `store/reconcileSummaries.ts`.

---

## 7. Summary Scheduler

When context changes (e.g. a new selection group is added), every pinned variable needs a new
summary. All required pairs become ready simultaneously. Without staggering, every
`pool.dispatch()` call would fire in the same microtask, causing the main thread to
structured-clone multiple large typed arrays back-to-back before yielding to the browser.

`scheduleSummary` serializes dispatch calls through a simple queue, yielding via `setTimeout(0)`
between each task:

```ts
// hooks/summaryScheduler.ts
function drain() {
  // Always defer via setTimeout — prevents postMessage structured cloning
  // from running synchronously during React's effect flush cycle.
  setTimeout(() => {
    const task = queue.shift()!
    task().finally(() => {
      running = false
      if (queue.length > 0) setTimeout(drain, 0)
    })
  }, 0)
}
```

`flushSummaryQueue()` empties the queue immediately (e.g. when a selection group is cleared),
discarding pending tasks for stale context. In-flight pool tasks continue but are discarded by
version checks.

**Key file:** `hooks/summaryScheduler.ts`.

---

## 8. Selection Filter Buffer

When a user draws a selection, the polygon is sent to a worker which performs point-in-polygon
hit-testing (`pointsInPolygon` → `selection.handler.ts`) and returns a `Uint32Array` of matching
indices. On receipt, `_mergeFilterBuffer` builds a `Float32Array` of length `numPoints` with
`1.0` at each selected index and `0.0` elsewhere:

```ts
const buf = new Float32Array(embeddingData.numPoints)
for (const group of selectionGroups) {
  for (let i = 0; i < group.indices.length; i++) {
    buf[group.indices[i]] = 1
  }
}
set({ selectionFilterBuffer: buf })
```

This buffer drives two display modes:

- **Dim** (`selectionDisplayMode === 'dim'`): `dimColorBuffer` clones `colorBuffer` and sets
  alpha to `DIM_ALPHA` (10, ≈4%) for every point where `filterBuffer[i] === 0`. This runs on
  the main thread inside `layerData` useMemo and produces a modified `Uint8Array` that is passed
  to deck.gl as the color attribute.
- **Hide** (`selectionDisplayMode === 'hide'`): `selectionFilterBuffer` is passed as
  `getFilterValue` to the `DataFilterExtension`. deck.gl discards points with `filterValue === 0`
  on the GPU; no data re-upload occurs.

**Flash prevention on group clear.** When a group is removed, the filter buffer for the
remaining groups is pre-computed synchronously before the React state update. The component
tree is briefly set to `selectionGroups: []` to unmount charts cheaply, then restored to
`remaining` in the next `requestAnimationFrame`. The pre-computed filter buffer keeps the
scatterplot dimming stable throughout.

---

## 9. Debouncing Expensive Operations

The opacity slider triggers a color buffer rebuild on every change. Building a `Uint8Array` of
40 MB (10M × 4 bytes) in a worker on every slider tick would saturate the pool. A 150 ms
debounce batches rapid adjustments into a single rebuild:

```ts
// useAppStore.ts
const DEBOUNCE_MS = 150
let debounceTimer: ReturnType<typeof setTimeout> | null = null

setOpacity: (v) => {
  set({ opacity: v, colorBufferLoading: true })
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => get().rebuildColorBuffer(), DEBOUNCE_MS)
},
```

The GPU continues rendering the previous color buffer smoothly during the debounce window.

---

## 10. No Build Step for Sibling Packages

`@cbioportal-cell-explorer/zarrstore` and `@cbioportal-cell-explorer/profiler` have no build step.
Their `package.json` `exports` fields point directly at their `src/` entry files. Vite in
`highperformer` transpiles all workspace sources at dev and build time. Do not add a build step
to sibling packages without updating `vite.config.js`.

---

## File Map

```
src/
  store/
    useAppStore.ts          — Zustand store: EmbeddingData, ColorMode, SelectionGroup, all actions
    summarySubscriber.ts    — Store subscriber: reconciliation orchestration, in-flight dedup
    reconcileSummaries.ts   — buildRequiredPairs(), reconcileSummaries()
  pool/
    WorkerPool.ts           — Task queue, transferable dispatch, clearQueue()
  workers/
    universal.worker.ts     — Message router + Zod schema validation
    colorBuffer.handler.ts  — Builds Uint8Array(N*4) from codes / expression / default
    colorBuffer.schemas.ts  — Zod schemas for color buffer messages
    selection.handler.ts    — Rectangle bounds check + ray-casting point-in-polygon
    selection.schemas.ts    — Zod schemas for selection messages
    summary.handler.ts      — KDE, histogram, quartiles, category counts, dot-plot stats
    summary.schemas.ts      — Zod schemas for summary messages
  hooks/
    summaryScheduler.ts     — Sequential task queue with setTimeout(0) yielding
  utils/
    categoryEncoding.ts     — String → Uint8Array code encoding, MAX_CATEGORIES guard
    colors.ts               — CATEGORICAL_COLORS, COLOR_SCALES, interpolateColorScale
    selectionGeometry.ts    — pointInPolygon (ray-casting)
  pages/
    View.tsx                — Layout, MemoizedVisualization, layerData/layers useMemo
  components/
    ColorBySection.tsx      — Color mode selector, obs column / gene picker
    SelectionOverlay.tsx    — Mouse event capture for rectangle and lasso tools
    SelectionToolbar.tsx    — Tool switcher, display mode toggle, clear buttons
    SummaryPanel.tsx        — Right sidebar: pinned variables, chart list
    GroupOverview.tsx       — Per-group cell count and color badge
    ViolinBoxChart.tsx      — Violin + box plot (visx) for expression per group
    CategoryDotPlot.tsx     — Dot plot (mean expression × fraction expressing)
    CategorySummaryChart.tsx — Bar chart for categorical obs distributions
```
