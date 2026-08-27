# Highperformer Store Dependency Analysis

Ref: https://github.com/cBioPortal/cbioportal-cell-explorer/issues/178

## State Sections

1. **Dataset** — `datasetUrl`, `adata`, `loading`, `nObs`, `nVar`, `obsmKeys`
2. **Rendering** — `pointRadius`, `opacity`, `antialiasing`, `collisionEnabled`, `collisionRadiusScale`
3. **Embedding** — `selectedEmbedding`, `embeddingData`, `embeddingLoading`, `_embeddingAbort`
4. **Color buffer** — `colorBuffer`, `colorBufferLoading`
5. **Color-by** — `colorMode`, `selectedObsColumn`, `selectedGene`, `colorScaleName`, `obsColumnNames`, `varNames`, `categoryMap`, `expressionRange`, `categoryWarning`, `_categoryCodes`, `_expressionData`, `_colorAbort`
6. **Gene labels** — `varColumns`, `geneLabelColumn`, `geneLabelMap`
7. **Highlight** — `highlightedCategories`, `radiusBuffer`
8. **Selection** — `selectionTool`, `selectionDisplayMode`, `selectionGroups`, `selectionFilterBuffer`
9. **Custom group** — `customGroupColumn`, `customGroupIds`, `customGroupUnmatched`, `customGroupWarning`, `customGroupLoading`, `customGroupRecomputing`, `customGroupIndexMap`, `customGroupEnabledIds`, `customGroupCommittedCount`, `customGroupPreviousEnabledIds`
10. **Summary** — `summaryPanelOpen`, `summaryObsColumns`, `summaryGenes`, `summaryObsData`, `summaryObsContinuousData`, `summaryGeneData`, `summaryGeneRanges`, `summaryCache`

## Cross-Section Dependency Matrix

R = reads, W = writes. Only actions with cross-section dependencies are shown.

| Action | Dataset | Rendering | Embedding | Color buf | Color-by | Gene labels | Highlight | Selection | Custom grp | Summary |
|---|---|---|---|---|---|---|---|---|---|---|
| `setOpacity` | | W | | W | | | | | | |
| `toggleCategoryHighlight` | | | | W | | | RW | | | |
| `clearCategoryHighlights` | | | | W | | | RW | | | |
| `commitSelection` | | | R | | | | | RW | | W |
| `_onSelectionResult` | | | | | | | | RW | | |
| `_mergeFilterBuffer` | | | R | | | | | RW | R | |
| `clearGroup` | | | R | | | | | RW | RW | |
| `clearAllSelections` | | | | | | | | W | W | |
| `loadCustomGroupColumn` | R | | R | | | | | | W | |
| `selectByIds` | R | | R | | | | | RW | RW | W |
| `clearCustomGroup` | | | | | | | | RW | RW | |
| `commitCustomGroupToggle` | | | | | | | | RW | RW | |
| `openDataset` | RW | W | W | W | W | W | W | W | W | W |
| `fetchEmbedding` | R | | RW | | W | W | | | | |
| `rebuildColorBuffer` | | R | R | W | R | | R | | | |
| `setColorMode` | | | | W | W | | W | | | |
| `selectObsColumn` | R | | | W | RW | | W | | | W |
| `clearObsColumn` | | | | W | RW | | W | | | |
| `selectGene` | R | | | W | RW | | | | | W |
| `clearGene` | | | | W | RW | | | | | |
| `setColorScaleName` | | | | W | W | | | | | |
| `_resolveGeneLabels` | R | | | | R | RW | | | | |

## Coupling Clusters

### Tightly coupled (do not split apart)

- **Color pipeline** — Color-by + Color buffer + Highlight
  - 7 shared actions, all funneling through `rebuildColorBuffer`
  - `rebuildColorBuffer` reads Embedding, Rendering, Color-by, Highlight and writes Color buffer
- **Filter pipeline** — Selection + Custom group
  - 6 shared actions, unified by `_mergeFilterBuffer`
  - `_mergeFilterBuffer` reads Embedding, Selection, Custom group and writes Selection

### Loosely coupled (safe to extract)

- **Dataset** — written only during `openDataset` (global reset), read-only dependency for others
- **Rendering** — only `opacity` crosses boundaries via `rebuildColorBuffer`
- **Summary** — reads Dataset for fetches, otherwise self-contained; nothing depends on it
- **Gene labels** — near-standalone, only side-effect write from `fetchEmbedding`

## Recommended Slice Layout

```
store/
  slices/
    datasetSlice.ts        # Dataset (passive data source)
    renderingSlice.ts      # Rendering (simple settings)
    summarySlice.ts        # Summary (self-contained CRUD)
    geneLabelSlice.ts      # Gene labels (near-standalone)
    colorPipelineSlice.ts  # Color-by + Color buffer + Highlight
    filterPipelineSlice.ts # Selection + Custom group
  utils/
    rebuildColorBuffer.ts  # pure fn, no store dependency
    mergeFilterBuffer.ts   # pure fn, no store dependency
  useAppStore.ts           # composes slices
```

Highest-leverage change: extract `rebuildColorBuffer` and `_mergeFilterBuffer` as pure functions that accept explicit arguments instead of closing over `get()`/`set()`. This removes implicit cross-section coupling and makes them independently testable.
