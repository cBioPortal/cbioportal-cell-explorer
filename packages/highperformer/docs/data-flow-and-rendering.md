# Data Flow, Rendering, and Message Passing

This document describes how data moves through the highperformer package: from zarr files over HTTP
to typed arrays in the zustand store, through web workers for computation, and into deck.gl for GPU
rendering. It covers every major pipeline and the message-passing boundaries between threads.

For the summary computation architecture specifically, see
[summary-computation-architecture.md](./summary-computation-architecture.md).

---

## Table of Contents

1. [Dataset Loading](#1-dataset-loading)
2. [Embedding Loading](#2-embedding-loading)
3. [Color Buffer Pipeline](#3-color-buffer-pipeline)
4. [Selection Flow](#4-selection-flow)
5. [Summary Computation](#5-summary-computation)
6. [Worker Pool and Message Passing](#6-worker-pool-and-message-passing)
7. [deck.gl Rendering Pipeline](#7-deckgl-rendering-pipeline)
8. [React Rendering Boundaries](#8-react-rendering-boundaries)
9. [Thread Boundary Map](#9-thread-boundary-map)

---

## 1. Dataset Loading

**Entry point:** `openDataset(url)` in `useAppStore.ts`

```
User selects dataset URL
  |
  v
openDataset(url)
  |
  v
Reset store state (clear previous embedding, colors, selections, summaries, summaryCache)
  |
  v
AnnDataStore.open(url) -- async HTTP fetch from zarr root
  |
  v
Extract metadata:
  - adata.obsmKeys() -> embedding names (e.g. ["umap", "pca"])
  - Auto-detect UMAP or use first embedding
  - Set nObs, nVar, obsmKeys
  |
  v
Trigger fetchEmbedding(defaultKey) immediately
```

**Key state fields set:**
- `datasetUrl` (string | null) -- zarr root URL
- `adata` (AnnDataStore | null) -- data access object
- `nObs`, `nVar` (number | null) -- dataset dimensions
- `obsmKeys` (string[]) -- available embeddings

All zarr I/O goes through the `@cbioportal-cell-explorer/zarrstore` package. AnnDataStore handles
HTTP range requests, chunk decompression, and typed array assembly. The main thread receives
finished typed arrays; no decompression happens on the main thread.

---

## 2. Embedding Loading

**Entry point:** `fetchEmbedding(key)` in `useAppStore.ts`

```
setSelectedEmbedding(key)
  |
  v
Abort any in-flight fetch (AbortSignal)
  |
  v
adata.obsm(key, signal, 2) -- HTTP range request to zarr
  Returns: { data: TypedArray, shape: [numPoints, 2] }
  |
  v
Convert Float16Array to Float32Array if needed (deck.gl requires Float32)
  |
  v
computeBounds() -- O(n) scan for minX, maxX, minY, maxY
  |
  v
Store EmbeddingData { positions: Float32Array, numPoints, bounds }
  |
  v
In parallel: fetch metadata
  - adata.obsColumns() -> obsColumnNames[]
  - adata.varNames() -> varNames[]
  - adata.varColumns() -> varColumns[]
  - Auto-detect gene label column (GENE_SYMBOL_COLUMNS)
  |
  v
Trigger rebuildColorBuffer() with default RGB colors
```

**Key state fields set:**
- `embeddingData` -- positions (Float32Array, length = numPoints * 2) + bounds
- `embeddingLoading` -- UI spinner state
- `obsColumnNames[]`, `varNames[]`, `varColumns[]` -- picker options

**Performance notes:**
- Float16 to Float32 conversion is a one-time cost on load
- Bounds computation is a linear scan, runs once per embedding switch
- Metadata fetches run in the background (non-blocking)

---

## 3. Color Buffer Pipeline

### 3.1 Trigger Points

`rebuildColorBuffer()` is called when:
- Embedding loads (default RGB)
- Opacity slider changes (debounced 150ms)
- Color mode switches (default / category / gene)
- Obs column or gene is selected for coloring
- Color scale changes

**Debouncing (opacity slider):**
```
setOpacity(v)
  -> set({ opacity: v, colorBufferLoading: true })
  -> clearTimeout(debounceTimer)
  -> debounceTimer = setTimeout(() => rebuildColorBuffer(), 150)
```

### 3.2 Worker Dispatch

```
colorBuildVersion++ (stale response guard)
  |
  v
Build message based on colorMode:
  - 'default':  { type: 'buildDefault',        numPoints, rgb: [100,150,255], alpha }
  - 'category': { type: 'buildFromCategories',  numPoints, categories: Uint8Array, alpha }
  - 'gene':     { type: 'buildFromExpression',  numPoints, expression: Float32Array, min, max, alpha, scaleName }
  |
  v
getPool().dispatch(message) -> Promise<{ buffer: Uint8Array }>
  |
  v
On resolve: if version === colorBuildVersion, set({ colorBuffer: response.buffer })
```

### 3.3 Worker Computation

All three message types produce a `Uint8Array` of length `numPoints * 4` (RGBA, one byte per
channel per point).

| Message type | Work per point | Notes |
|---|---|---|
| `buildDefault` | 4 byte writes | Uniform color + alpha |
| `buildFromCategories` | Palette lookup + 4 writes | `categories[i] % numColors` selects from 12 predefined colors |
| `buildFromExpression` | Normalize + interpolate + 4 writes | `(expression[i] - min) / range` mapped through color scale |

All are O(numPoints). The result is a complete RGBA buffer ready for deck.gl binary attributes.

### 3.4 Data Dependencies

The raw data for coloring is cached in the store:
- `_categoryCodes` (Uint8Array) -- set by `selectObsColumn(name)` after fetching from zarr
- `_expressionData` (Float32Array) -- set by `selectGene(name)` after fetching from zarr
- Both are fetched lazily on first use, then cached for instant re-coloring

---

## 4. Selection Flow

### 4.1 User Draws Selection

`SelectionOverlay` component handles mouse events. Two modes:

**Rectangle:** On mouse up, unproject screen coordinates to world coordinates, form a 4-vertex
polygon, call `commitSelection(polygon, 'rectangle')`.

**Lasso:** Accumulate points as the user draws, simplify with Douglas-Peucker, unproject to world
coordinates, call `commitSelection(polygon, 'lasso')`.

### 4.2 Hit-Testing Dispatch

```
commitSelection(polygon, type)
  |
  v
Create SelectionGroup {
  id: nextAvailableId (1-3),
  polygon,
  type,
  indices: new Uint32Array(0),  // placeholder
  color: GROUP_COLORS[id - 1],
}
  |
  v
Add to store immediately (UI shows empty group)
  |
  v
Open summary panel if not open
  |
  v
selectionVersion++
  |
  v
getPool().dispatch({
  type: 'pointsInPolygon',
  positions: embeddingData.positions,  // Float32Array
  numPoints,
  polygon,
  selectionType: type,
  version,
})
  |
  v
On resolve: _onSelectionResult(groupId, indices, version)
```

### 4.3 Worker Hit-Testing

| Selection type | Algorithm | Complexity |
|---|---|---|
| Rectangle | Bounds check (4 comparisons) | O(numPoints) |
| Lasso | Ray-casting point-in-polygon | O(numPoints * numVertices) |

The worker returns `{ indices: Uint32Array }`. The indices buffer is **transferred** (zero-copy)
back to the main thread.

### 4.4 Filter Buffer Construction

```
_onSelectionResult(groupId, indices, version)
  |
  v
Stale check: if version !== selectionVersion, discard
  |
  v
Update group's indices in selectionGroups
  |
  v
_mergeFilterBuffer()
  |
  v
Build Float32Array(numPoints), init to 0.0
  For each group, for each index: filterBuffer[index] = 1.0
  |
  v
set({ selectionFilterBuffer: buf })
```

The filter buffer is used by deck.gl in two ways:
1. **Dim mode:** `dimColorBuffer()` copies the color buffer, sets alpha to ~4% for unselected points
2. **Hide mode:** `DataFilterExtension` with `getFilterValue` and `filterRange: [1, 1]` hides
   unselected points on the GPU

### 4.5 Group Removal: Clear-then-Re-add

Removing a group uses a two-frame strategy to avoid CPU spikes:

```
clearGroup(id)
  |
  v
flushSummaryQueue() + getPool().clearQueue()  // cancel pending summary work
  |
  v
Pre-compute selectionFilterBuffer for remaining groups
  |
  v
set({ selectionGroups: [], selectionFilterBuffer: precomputed })
  // Frame 1: charts unmount (hasGroups = false), scatterplot keeps dimming
  |
  v
requestAnimationFrame(() => {
  set({ selectionGroups: remaining })
  // Frame 2: charts mount fresh with loading spinners
})
```

**Trade-offs:**
- Selection polygons blink for one frame (selectionGroups briefly empty)
- Remaining groups' summaries are recomputed (brief spinners)
- The UI never blocks

---

## 5. Summary Computation

See [summary-computation-architecture.md](./summary-computation-architecture.md) for full details.

**Key points for data flow context:**

### 5.1 Data Loading

When users add variables to the summary panel:
- `addSummaryObsColumn(name)` fetches via `adata.obsColumn(name)`, classifies as categorical
  (string array -> `{ codes: Uint8Array, categoryMap }`) or continuous (TypedArray ->
  `Float32Array`)
- `addSummaryGene(name)` fetches via `adata.geneExpression(name)`, stores as `Float32Array`

### 5.2 Subscriber-Driven Reconciliation

A zustand subscriber watches `selectionGroups`, `summaryObsData`, `summaryObsContinuousData`,
`summaryGeneData`, and `embeddingData`. When any change:

```
State change detected
  |
  v
summarySubscriber fires
  |
  v
buildRequiredPairs() -- cross-product of (variables x groups)
  |
  v
reconcileSummaries()
  |-- prune stale cache entries
  |-- dispatch missing pairs via summaryScheduler (setTimeout(0) between each)
  |
  v
Workers compute category counts or expression stats
  |
  v
_cacheSummaryResult(key, groupId, result) -- writes to summaryCache only
  // Subscriber does NOT watch summaryCache -> no cascade
```

### 5.3 Component Reading

Components are pure readers:
```
useAppStore((s) => s.summaryCache.get(`cat:${name}`))  // CategoryCard
useAppStore((s) => s.summaryCache.get(`expr:${name}`)) // ExpressionCard
```

No `useEffect`, no `useState`, no worker dispatch from components.

---

## 6. Worker Pool and Message Passing

### 6.1 Pool Architecture

`WorkerPool` manages N workers (default: `navigator.hardwareConcurrency - 1`).

```
WorkerPool
  |-- workers: PoolWorker[]  (each wraps a Worker + busy flag)
  |-- queue: QueuedTask[]    (tasks waiting for a free worker)
  |-- pending: Map<taskId, resolver>  (in-flight tasks awaiting response)
  |-- nextTaskId: number
```

### 6.2 Dispatch Flow

```
dispatch(message, transferables?) -> Promise<T>
  |
  v
Assign taskId, attach _poolTaskId to message
  |
  v
Find idle worker?
  Yes -> send(worker, message, resolve, taskId, transferables)
  No  -> queue.push({ message, resolve, reject, taskId })
```

When a worker completes:
```
worker.onmessage(event)
  |
  v
Extract _poolTaskId from response
  |
  v
Resolve pending Promise
  |
  v
Mark worker as not busy
  |
  v
dequeue() -- send next queued task to this worker
```

### 6.3 Message Types

All messages cross the main thread / worker boundary via `postMessage`. The worker
(`universal.worker.ts`) routes by `message.type`:

| Message type | Handler | Input | Output |
|---|---|---|---|
| `buildDefault` | colorBuffer.handler | numPoints, rgb, alpha | `{ buffer: Uint8Array }` |
| `buildFromCategories` | colorBuffer.handler | numPoints, categories, alpha | `{ buffer: Uint8Array }` |
| `buildFromExpression` | colorBuffer.handler | numPoints, expression, min, max, alpha, scaleName | `{ buffer: Uint8Array }` |
| `pointsInPolygon` | selection.handler | positions, numPoints, polygon, selectionType | `{ indices: Uint32Array }` |
| `summarizeCategory` | summary.handler | codes, indices, numCategories | `{ counts: Uint32Array }` |
| `summarizeExpression` | summary.handler | expression, indices, numBins, clipMin? | `ExpressionStats` (see below) |

### 6.4 Data Transfer

**Structured clone (default):** Typed arrays are copied between threads. Used for color buffers
and summary data where the main thread needs to retain the source data.

**Transferable (zero-copy):** The buffer ownership moves to the receiving thread. Used for
selection result indices (`response.indices.buffer` transferred back to main thread). The worker
loses access to the buffer after transfer.

### 6.5 Queue Management

`clearQueue()` drops all queued (not-yet-sent) tasks and resolves their promises with `{}` to
avoid unhandled rejections. Called on group changes to prevent stale dispatches.

`flushSummaryQueue()` clears the summary scheduler's internal queue, canceling pending
`setTimeout` callbacks.

---

## 7. deck.gl Rendering Pipeline

### 7.1 Layer Data Construction

The `Visualization` component builds layer data via `useMemo`:

```typescript
const layerData = useMemo(() => {
  const attributes = {
    getPosition: { value: embeddingData.positions, size: 2 }
  }

  // Apply selection dimming
  const effectiveColor = colorBuffer && selectionFilterBuffer && displayMode === 'dim'
    ? dimColorBuffer(colorBuffer, selectionFilterBuffer)
    : colorBuffer

  if (effectiveColor) {
    attributes.getFillColor = { value: effectiveColor, size: 4, normalized: true }
  }

  return { length: embeddingData.numPoints, attributes }
}, [embeddingData, colorBuffer, selectionFilterBuffer, selectionDisplayMode])
```

**Binary attribute format:** Typed arrays passed directly as GPU vertex attributes. No per-point
accessor functions. No array-of-objects conversion.

### 7.2 ScatterplotLayer Configuration

```typescript
new ScatterplotLayer({
  id: 'scatterplot',
  data: layerData,
  dataComparator: (a, b) => a === b,       // Reference equality for data object
  updateTriggers: {
    getFillColor: [colorBuffer, selectionFilterBuffer, selectionDisplayMode],
    getFilterValue: [selectionFilterBuffer],
  },
  getRadius: pointRadius,
  radiusUnits: 'pixels',
  antialiasing,
  extensions: [
    new DataFilterExtension({ filterSize: 1 }),
    ...(collisionEnabled ? [new CollisionFilterExtension()] : []),
  ],
  getFilterValue: hideMode
    ? (_, { index }) => selectionFilterBuffer[index]
    : 1,
  filterEnabled: hideMode,
  filterRange: [1, 1],
})
```

**Key points:**
- `dataComparator` prevents unnecessary data re-uploads when the reference hasn't changed
- `updateTriggers` tell deck.gl exactly which attributes changed
- `DataFilterExtension` handles hide mode entirely on the GPU
- `CollisionFilterExtension` handles point overlap at high zoom levels
- Pan/zoom is handled by deck.gl's `OrthographicController` internally (never touches React)

### 7.3 Selection Overlays

Selection polygons are rendered as a separate `PolygonLayer`:
```typescript
new PolygonLayer({
  id: 'selection-polygons',
  data: selectionGroups.filter(g => g.indices.length > 0),
  getPolygon: d => d.polygon,
  getFillColor: d => [...d.color, 30],    // Semi-transparent fill
  getLineColor: d => [...d.color, 200],   // Solid outline
  lineWidthMinPixels: 1,
})
```

### 7.4 What Triggers GPU Re-upload

| State change | Re-upload? | Why |
|---|---|---|
| `embeddingData` | Yes | New position buffer |
| `colorBuffer` | Yes | New color buffer |
| `selectionFilterBuffer` | Yes (dim mode) | dimColorBuffer creates new Uint8Array |
| `pointRadius` | No | Uniform, not per-vertex |
| `summaryCache` | No | Not subscribed by Visualization |
| Pan/zoom | No | GPU-side viewport transform only |
| Hover/pick | No | Tooltip only, no layer data change |

---

## 8. React Rendering Boundaries

### 8.1 Component Tree

```
View (page component)
  |-- Sidebar (controls, settings)
  |-- MemoizedVisualization (deck.gl canvas)
  |     |-- ScatterplotLayer
  |     |-- PolygonLayer (selections)
  |     |-- SelectionOverlay (mouse events)
  |-- SummaryPanel
        |-- VariablePicker (obs columns)
        |-- VariablePicker (genes)
        |-- Segmented (All Cells / Selections toggle)
        |-- [CSS display:none] All Cells charts
        |     |-- ByVariableView (obs)
        |     |     |-- CategoryCard -> CategorySummaryChart
        |     |     |-- ExpressionCard -> ExpressionSummaryChart
        |     |-- ByVariableView (genes)
        |           |-- ExpressionCard -> ExpressionSummaryChart
        |-- [CSS display:none] Selections charts
              |-- GroupOverview (Venn diagram)
              |-- ByVariableView (obs)
              |-- ByVariableView (genes)
```

### 8.2 Isolation Rules

- **Visualization** subscribes only to rendering state. Summary cache changes never cause a
  Visualization re-render.
- **SummaryPanel** and its children subscribe only to summary-related state. Color buffer and
  embedding changes never cause summary chart re-renders.
- **Sidebar** controls modify store state that triggers either color rebuild (worker) or layer
  prop changes. It does not read summary data.

### 8.3 Zustand Selector Pattern

Every `useAppStore()` call selects exactly one primitive or stable reference:
```typescript
// Good -- atomic selectors
const colorBuffer = useAppStore((s) => s.colorBuffer)
const pointRadius = useAppStore((s) => s.pointRadius)

// Bad -- would re-render on any state change
const { colorBuffer, pointRadius } = useAppStore((s) => s)
```

Zustand uses `Object.is` to compare selector results. Atomic selectors ensure components only
re-render when their specific data changes.

### 8.4 Dual-Mount CSS Toggle

Both "All Cells" and "Selections" chart sets are always mounted in the DOM. The active context is
shown with `display: block`; the inactive is hidden with `display: none`.

This works because components are pure store readers. Mounting additional chart instances does not
trigger additional worker dispatches (the subscriber handles all computation centrally). Switching
contexts is instant -- no unmount/remount, no re-initialization.

---

## 9. Thread Boundary Map

```
MAIN THREAD                          WORKER THREADS (N = hardwareConcurrency - 1)
============                          ===============================================

  React / Zustand                     universal.worker.ts
  |                                     |-- colorBuffer.handler.ts
  |-- openDataset()                     |-- selection.handler.ts
  |     |                               |-- summary.handler.ts
  |     v
  |   AnnDataStore (HTTP/zarr)
  |     |
  |     v
  |   embeddingData, obsData, geneData
  |     |
  |     |-- rebuildColorBuffer()
  |     |     |
  |     |     +---postMessage--->  buildDefault / buildFromCategories / buildFromExpression
  |     |                                |
  |     |     <---onmessage------  { buffer: Uint8Array(RGBA) }
  |     |     |
  |     |     v
  |     |   set({ colorBuffer })
  |     |
  |     |-- commitSelection()
  |     |     |
  |     |     +---postMessage--->  pointsInPolygon
  |     |                                |
  |     |     <---transfer-------  { indices: Uint32Array }
  |     |     |
  |     |     v
  |     |   set({ selectionGroups, selectionFilterBuffer })
  |     |
  |     |-- summarySubscriber (zustand.subscribe)
  |           |
  |           +---scheduleSummary--->  summarizeCategory / summarizeExpression
  |           |   (setTimeout(0))            |
  |           |                              |
  |           <---onmessage----------  { counts / stats }
  |           |
  |           v
  |         _cacheSummaryResult() -> set({ summaryCache })
  |
  |-- Visualization (deck.gl)
  |     reads: embeddingData, colorBuffer, selectionFilterBuffer
  |     does NOT read: summaryCache, summaryObsData, summaryGeneData
  |
  |-- SummaryPanel
        reads: summaryCache, summaryObsData, summaryGeneData
        does NOT read: colorBuffer, embeddingData.positions
```

### Data Format Summary

| Data | Type | Size at 1M points | Thread |
|---|---|---|---|
| Positions | Float32Array | 8 MB (2 floats/point) | Main |
| Color buffer | Uint8Array | 4 MB (RGBA/point) | Worker -> Main |
| Filter buffer | Float32Array | 4 MB (1 float/point) | Main |
| Selection indices | Uint32Array | Variable (transferred) | Worker -> Main |
| Category codes | Uint8Array | 1 MB (1 byte/point) | Main -> Worker |
| Expression data | Float32Array | 4 MB (1 float/point) | Main -> Worker |
| Category counts | Uint32Array | Tiny (num categories) | Worker -> Main |
| Expression stats | Object | Tiny (~1 KB) | Worker -> Main |

### Version Guards

Every async worker dispatch uses a version counter to detect stale responses:

```
colorBuildVersion   -- guards color buffer results
selectionVersion    -- guards selection hit-test results
versionRef (clipMin) -- guards clip-min recomputation results
```

Pattern: increment before dispatch, check on resolve. If the version has moved forward, discard
the result silently.
