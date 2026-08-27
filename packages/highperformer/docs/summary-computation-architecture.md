# Summary Computation Architecture

This document describes the architecture of the summary computation system in the highperformer
package, including the problems that motivated a full redesign and the decisions made in the new
implementation.

---

## Background: Why the Architecture Changed

The original design placed computation ownership inside React hooks (`useExpressionSummary`,
`useCategorySummary`, `useAllCellsSummary`, `useSummaryData`). Each hook instance owned its own
cache (`useRef`), dispatched web workers via `useEffect`, and updated React state (`useState`) when
results arrived.

This produced three compounding problems.

**Cache never populates.** Group changes arrive faster than workers return results. Each group
change triggers a new effect run that sees an empty cache and re-dispatches every worker. React
StrictMode's double-mounting makes this worse because it intentionally destroys and re-creates hook
instances, wiping the cache on every mount.

**Dual-context mounting doubles work.** The "All Cells" and "Selections" chart sets were both
mounted simultaneously (using a CSS toggle for instant switching between views). Each set had its
own hook instances with independent caches, so every worker dispatch happened twice.

**Worker completion cascade.** Each time a worker completed, it called `setResult`, which triggered
a React re-render, which flushed effects, which dispatched more workers, which completed and called
`setResult` again. This feedback loop blocked the main thread for 8-16 seconds on group removal.

---

## Design Principle

> React renders. The store computes.

Components read pre-computed results from the zustand store. They do not trigger computation. No
component may dispatch a worker or own a computation cache as part of the core summary pipeline.

---

## Cache Structure

Summary results live in a two-level `Map` in the zustand store:

```
summaryCache: Map<string, Map<number, Result>>
```

| Level | Key | Value |
|-------|-----|-------|
| Outer | Variable identifier (`"cat:dataset"`, `"expr:ENSG00000163331"`) | Inner map |
| Inner | Group id (`-1` for All Cells, `1`/`2`/`3` for selections) | Computed result |

Result types:
- **Category variables:** `Uint32Array` of per-category counts
- **Expression / continuous variables:** `ExpressionStats` object

The `ALL_CELLS_GROUP_ID` constant (`-1`) is defined in `src/constants.ts` and shared across the
store, subscriber, and components.

---

## Computation Flow

A zustand `subscribe` listener defined in `summarySubscriber.ts` watches four pieces of store
state: `selectionGroups`, `summaryObsData`, `summaryObsContinuousData`, `summaryGeneData`, and
`embeddingData`.

When any of these change, the subscriber calls `reconcileSummaries()`, which:

1. Builds the complete set of required `(variable, groupId)` pairs from the current groups and
   variable lists.
2. Prunes `summaryCache` entries for groups or variables that no longer exist.
3. Compares required pairs against the cache and the in-flight tracking set.
4. Dispatches workers only for pairs that are missing from both.

Worker dispatches are staggered by `summaryScheduler.ts` using `setTimeout(0)` between each task.
This yields to the event loop between dispatches and prevents synchronous `postMessage` structured
cloning from running during React's effect flush cycle.

When a worker completes, it calls `_cacheSummaryResult(variableKey, groupId, result)`. This action
writes only to `summaryCache`. It does not touch `selectionGroups`, variable lists, or any other
state that the subscriber watches.

**The subscriber watches groups and variables. It does not watch the cache. Worker completions
therefore cannot re-trigger reconciliation.** This is what breaks the cascade.

```
store state change
      │
      ▼
summarySubscriber
      │
      ▼
reconcileSummaries()
  ├── prune stale cache entries
  └── dispatch missing pairs via summaryScheduler
            │
            ▼ (setTimeout(0) per task)
       WorkerPool
            │
            ▼ (worker result)
  _cacheSummaryResult(key, groupId, result)
            │
            ▼
       summaryCache  ─── (subscriber does NOT watch this)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/store/reconcileSummaries.ts` | Pure diff function: builds required pairs, prunes stale cache entries, dispatches missing pairs |
| `src/store/reconcileSummaries.test.ts` | Unit tests for the reconciliation logic |
| `src/store/summarySubscriber.ts` | Zustand subscriber that wires `reconcileSummaries` to the store; manages in-flight tracking and queue flushing |
| `src/store/useAppStore.ts` | Added `summaryCache`, `_cacheSummaryResult` action, and subscriber activation |
| `src/types/summaryTypes.ts` | Shared `ExpressionStats` interface (extracted from the deleted hook) |
| `src/hooks/summaryScheduler.ts` | Staggers worker dispatches with `setTimeout(0)` yielding between tasks; exports `flushSummaryQueue()` |
| `src/pool/WorkerPool.ts` | Added `clearQueue()` to drop queued tasks and a `transferables` parameter |
| `src/constants.ts` | Shared `ALL_CELLS_GROUP_ID = -1` constant |

### Deleted Files

| File | Reason |
|------|--------|
| `src/hooks/useExpressionSummary.ts` | Replaced by store-driven computation |
| `src/hooks/useCategorySummary.ts` | Replaced by store-driven computation |
| `src/hooks/useAllCellsSummary.ts` | Replaced by subscriber building All Cells group |
| `src/hooks/useSummaryData.ts` | Replaced by store-driven computation |

---

## Component Changes

### ByVariableView.tsx

`CategoryCard` and `ExpressionCard` now read results from `summaryCache` using zustand selectors
and `useMemo`. There are no `useEffect` calls, no `useState` calls, and no computation triggered
from within these components. Drag-and-drop reordering support was also added in this pass.

### SummaryPanel.tsx

The dual-mount CSS toggle was restored. Both the "All Cells" and "Selections" chart sets are always
mounted. This is safe under the new architecture because components are pure readers — mounting
additional instances does not trigger additional worker dispatches. Switching between contexts is
instant via `display: none`.

### CategorySummaryChart.tsx / ExpressionSummaryChart.tsx

An `onRemove` prop was added for the close button. Imports were updated to use shared constants
from `src/constants.ts`.

---

## Additional Performance Improvements

### GroupOverview Bitmask Optimization

`computeOverlap` was rewritten from a `Map<number, number[]>` membership-tracking approach to a
`Uint8Array` bitmask. With at most 3 groups, each group is assigned a bit (1, 2, 4). A cell's
membership across all groups is encoded as a single byte. This reduced overlap computation time
from ~2000 ms to ~10-22 ms on large datasets.

### clearGroup: Clear-then-Re-add Strategy

Removing a group still caused a CPU spike because synchronous re-rendering of chart components with
partially modified group data was expensive. The new strategy:

1. Pre-compute the `selectionFilterBuffer` for the remaining groups so the scatterplot dimming does
   not flash.
2. Call `set({ selectionGroups: [], selectionFilterBuffer: precomputed })` — clears all groups,
   which unmounts selection charts immediately (`hasGroups` becomes false).
3. Call `requestAnimationFrame(() => set({ selectionGroups: remaining }))` — re-adds remaining
   groups in the next frame; charts mount fresh with loading spinners and workers recompute
   summaries.

Trade-off: remaining groups' summaries are recomputed (brief spinners), and selection polygons
blink for one frame. The UI never blocks.

### Worker Queue Management

`WorkerPool.clearQueue()` drops all queued (not yet sent) tasks and resolves their promises with
`{}` to avoid unhandled rejections. `summaryScheduler` exposes `flushSummaryQueue()` to cancel
pending scheduler tasks on group changes, ensuring stale dispatches are not sent after the store
state has already moved forward.

---

## Visualization Isolation

The `Visualization` component subscribes only to rendering-related state (`embeddingData`,
`colorBuffer`, `selectionFilterBuffer`, etc.) via atomic zustand selectors. Because
`_cacheSummaryResult` modifies only `summaryCache`, `Visualization`'s selectors never observe a
change from summary cache updates. Summary computation does not cause the scatterplot to re-render.

---

## Known Remaining Considerations

### useClipMin Hook

`ExpressionSummaryChart.tsx` retains a `useClipMin` hook that dispatches workers via `useEffect`
when the clip-min feature is enabled by the user. This hook re-fires on group changes because
`groups` and `originalStats` are effect dependencies. It was intentionally left outside the
subscriber-driven pattern because it is user-triggered (a checkbox interaction) rather than part of
the automatic reconciliation cycle. It can be migrated to the store-driven pattern separately if
the re-fire behavior becomes a problem.

---

## Commit History

| Commit | Description |
|--------|-------------|
| `fad0b8a` | feat: add WorkerPool.clearQueue, summaryScheduler, and constants module |
| `0081baa` | perf: rewrite computeOverlap with bitmask array |
| `4a3faec` | feat: add onRemove prop to chart components and drag-and-drop deps |
| `fa06a4d` | feat: store-driven summary cache with zustand subscriber |
| `b1e237d` | refactor: chart components read from summaryCache, delete old hooks |
