# Cross-Overlap Stats Between Spatial and Custom Groups

## Problem

The Venn diagram in GroupOverview shows spatial group overlaps (G1 ∩ G2, etc.) but provides no information about how spatial groups relate to the custom group. A researcher who lasso-selects a cluster while a custom group is active cannot see how many custom group cells fall within that spatial selection.

## Constraints

- 4-circle Venn diagrams don't work reliably in 2D (not enough degrees of freedom to represent all pairwise overlaps with circles). We tried this and overlap positioning was incorrect.
- Keep the existing split layout: spatial circles on the left, custom circle on the right.

## Design

### Computation: `computeCrossOverlap`

A new pure function that computes the intersection between each spatial group and the custom group.

**Input:** `spatialGroups: SelectionGroup[]`, `customGroupIndexMap: Record<string, number[]>`, `customGroupEnabledIds: Set<string>`, `totalCells: number`.

**Important:** The custom group's `SelectionGroup.indices` is always `Uint32Array(0)` — a placeholder. The real cell indices live in `customGroupIndexMap`, keyed by ID string, filtered by `customGroupEnabledIds`. This is the same pattern used in `summarySubscriber.ts:122-132` and `commitCustomGroupToggle` in the store.

**Algorithm:**
1. Build a `Uint8Array(totalCells)` mask for custom group membership:
   ```
   for each id in customGroupEnabledIds:
     for each cellIndex in customGroupIndexMap[id]:
       mask[cellIndex] = 1
   ```
2. For each spatial group, scan its `indices` (Uint32Array) and count marked cells:
   ```
   for each group in spatialGroups:
     count = 0
     for each idx in group.indices:
       if mask[idx] === 1: count++
     result.set(group.id, count)   // group.id is 1, 2, or 3
   ```
3. Return `Map<number, number>` — spatial group ID (1/2/3) to intersection count with custom group.

**Complexity:** O(C + S) where C = total custom group cells, S = total spatial group cells. Single `Uint8Array(totalCells)` allocation.

**Uses committed state only.** Cross-overlap reflects `customGroupCommittedCount` / committed indices, not in-flight toggle previews (`customGroupRecomputing`). This matches how the rest of the UI displays the custom group.

### Memoization

In `GroupOverview`, wrap in `useMemo` using `customGroupCommittedCount` as the dependency signal (not `customGroupEnabledIds`, which updates during the preview/toggle phase before commit). Read `customGroupEnabledIds` and `customGroupIndexMap` inside the memo body via `useAppStore.getState()`:

```ts
const crossOverlap = useMemo(
  () => {
    if (spatialActiveGroups.length === 0 || customGroupCommittedCount === 0) return new Map()
    const { customGroupEnabledIds, customGroupIndexMap } = useAppStore.getState()
    return computeCrossOverlap(spatialActiveGroups, customGroupIndexMap, customGroupEnabledIds, totalCells)
  },
  [spatialActiveGroups, customGroupCommittedCount, totalCells],
)
```

This ensures cross-overlap only recomputes after commit, avoiding flicker during toggle recomputation. `customGroupCommittedCount` is already subscribed in `GroupOverview`. No new subscriptions needed.

`computeOverlap` continues to receive only `spatialActiveGroups` — the custom group is never passed to it.

### Stats Popover (click on Venn)

Split into two visual blocks to avoid ambiguity about what "Overlap" and "Jaccard" refer to. Spatial groups and their overlap stats are self-contained in the top block. The custom group and its cross-overlap stats are self-contained in the bottom block, separated by a divider.

The custom group block only renders when the custom group has committed cells > 0. Cross-overlap rows within it only render when at least one spatial group also has cells.

```
Group 1          1,200  (4.2%)
Group 2            800  (2.8%)
Overlap             150
Jaccard            8.3%
─────────────────────────────────
Custom: 5/10       500  (1.7%)
G1 ∩ Custom         342
G2 ∩ Custom         128
```

When there is only one spatial group (no spatial overlap/Jaccard to show):

```
Group 1          1,200  (4.2%)
─────────────────────────────────
Custom: 5/10       500  (1.7%)
G1 ∩ Custom         342
```

When there is no custom group, the divider and bottom block are omitted entirely:

```
Group 1          1,200  (4.2%)
Group 2            800  (2.8%)
Overlap             150
Jaccard            8.3%
```

### Summary Line (below Venn)

Cross-overlap counts go only in the popover, not the summary line. The summary line is already long with 3 spatial groups + custom + overlap. Adding cross-overlap counts per spatial group would overflow.

### Edge Cases

- **0 spatial groups, custom group only:** No cross-overlap section. Function returns empty Map.
- **Spatial groups exist, custom group has 0 committed cells:** No cross-overlap section. Function returns empty Map (mask is all zeros).
- **A spatial group with 0 cells:** Cross-overlap for that group is 0.
- **All spatial group cells are in the custom group:** Cross-overlap count equals the spatial group size. No special annotation.

### Files Changed

1. **`GroupOverview.tsx`** — add `computeCrossOverlap` function, add `useMemo` in `GroupOverview`, pass `crossOverlap` Map to `VennDiagram`, add cross-overlap rows to popover `statsContent`.
2. No store changes — all required data already available.

### What This Does NOT Change

- Venn circle layout stays split (spatial left, custom right, dashed divider).
- `computeOverlap` bitmask logic for spatial-only overlaps unchanged. Still receives only spatial groups.
- Custom group management (modal, toggles, etc.) unchanged.
- No new store state or subscriptions.
- Summary line format unchanged.
