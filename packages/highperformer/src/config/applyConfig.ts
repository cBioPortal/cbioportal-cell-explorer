import { AppConfigSchema, type AppConfig } from './schema'
import useAppStore from '../store/useAppStore'
import { waitForStore } from './waitForStore'
import { ok, err, type ApplyResult } from './applyResult'

/**
 * Resolve a user-facing gene identifier (var index or symbol) to the canonical
 * var index that `adata.geneExpression` requires.
 *
 * Datasets like MSK SPECTRUM store Ensembl IDs in `varNames` and HGNC symbols
 * in a `feature_name` column; `geneLabelMap` maps varIndex → symbol. Both the
 * agent and the sidebar UI surface symbols (DAPL1) to the user, but the
 * underlying lookup needs the index (ENSG00000176566). This accepts either
 * form and returns the index, or null if not found in either direction.
 */
function resolveGeneToVarIndex(
  label: string,
  varNames: string[],
  geneLabelMap: Map<string, string> | null,
): string | null {
  if (varNames.includes(label)) return label
  if (geneLabelMap) {
    for (const [varIndex, symbol] of geneLabelMap) {
      if (symbol === label) return varIndex
    }
  }
  return null
}

export async function applyConfig(input: unknown): Promise<ApplyResult> {
  const parsed = AppConfigSchema.safeParse(input)
  if (!parsed.success) {
    return err({ kind: 'schema_validation', details: parsed.error.issues })
  }
  const config: AppConfig = parsed.data

  // Cross-field validation: colorBy requires its companion field
  if (config.colorBy === 'gene' && !config.gene) {
    return err({ kind: 'missing_companion', field: 'gene' })
  }
  if (config.colorBy === 'category' && !config.category) {
    return err({ kind: 'missing_companion', field: 'category' })
  }
  // highlightedCategories is only meaningful when coloring by category.
  // Require colorBy='category' in the same payload to keep the contract explicit
  // (no implicit state-merge against current store).
  if (config.highlightedCategories !== undefined && config.colorBy !== 'category') {
    return err({
      kind: 'field_value_invalid',
      field: 'highlightedCategories',
      value: config.highlightedCategories,
      reason: "requires colorBy='category' and category to be set in the same payload",
    })
  }

  const store = useAppStore

  // Phase 1: Set UI toggles only when the caller supplied them
  store.setState({
    ...(config.showHeader !== undefined && { showHeader: config.showHeader }),
    ...(config.showLeftSidebar !== undefined && { showLeftSidebar: config.showLeftSidebar }),
    ...(config.showRightSidebar !== undefined && { showRightSidebar: config.showRightSidebar }),
    ...(config.showDatasetDropdown !== undefined && { showDatasetDropdown: config.showDatasetDropdown }),
  })

  // Phase 2: Trigger dataset load if requested
  if (config.dataset) {
    await store.getState().openCatalogDataset(config.dataset)
  } else if (config.url) {
    store.getState().openDataset(config.url)
  }

  // Phase 3: Wait for dataset metadata (or fail). If no dataset is loading
  // at all, surface that as metadata_unavailable instead of silently dropping.
  const hasPostLoadConfig =
    config.embedding ||
    config.colorBy !== undefined ||  // null is a valid clear sentinel
    config.geneLabelColumn ||
    config.filter ||
    config.filterByExpression ||
    config.summaryObsColumns !== undefined ||  // null = clear
    config.summaryGenes !== undefined ||  // null = clear
    config.removeSummaryObsColumns ||
    config.removeSummaryGenes ||
    config.viewport !== undefined ||  // null = reset to fit-to-view
    config.pointSize !== undefined ||  // null is a valid clear sentinel
    config.opacity !== undefined ||  // null is a valid clear sentinel
    config.summaryContext ||
    config.selectionDisplayMode

  if (!hasPostLoadConfig) return ok()

  const metadataReady = store.getState().obsColumnNames.length > 0
  const datasetLoading =
    !metadataReady && (config.dataset !== undefined || config.url !== undefined || store.getState().loading)

  if (!metadataReady && datasetLoading) {
    try {
      await waitForStore(store, (s) => s.obsColumnNames.length > 0)
    } catch {
      return err({ kind: 'metadata_unavailable', field: 'post-load' })
    }
  } else if (!metadataReady) {
    return err({ kind: 'metadata_unavailable', field: 'post-load' })
  }

  // 3a: Gene label column
  if (config.geneLabelColumn) {
    const { varColumns } = store.getState()
    if (!varColumns.includes(config.geneLabelColumn)) {
      return err({
        kind: 'field_value_invalid',
        field: 'geneLabelColumn',
        value: config.geneLabelColumn,
        reason: `not found in dataset var columns (available: ${varColumns.join(', ')})`,
      })
    }
    store.getState().setGeneLabelColumn(config.geneLabelColumn)
  }

  // 3b: Embedding
  if (config.embedding) {
    const { obsmKeys } = store.getState()
    if (!obsmKeys.includes(config.embedding)) {
      return err({
        kind: 'field_value_invalid',
        field: 'embedding',
        value: config.embedding,
        reason: `not found in dataset (available: ${obsmKeys.join(', ')})`,
      })
    }
    store.getState().setSelectedEmbedding(config.embedding)
  }

  // 3c: Color mapping (cross-field check is at the top of applyConfig).
  // Treat `colorBy: null` as an explicit reset — clear both color paths and
  // fall back to the default gray rendering.
  if (config.colorBy === null) {
    store.getState().clearGene()
    store.getState().clearObsColumn()
  } else if (config.colorBy === 'gene' && config.gene) {
    // If a gene label column was auto-detected, wait for the symbol→index
    // map to resolve so we can accept either the var index or the symbol.
    if (store.getState().geneLabelColumn && store.getState().geneLabelMap === null) {
      try {
        await waitForStore(store, (s) => s.geneLabelMap !== null)
      } catch {
        return err({ kind: 'metadata_unavailable', field: 'gene' })
      }
    }
    const { varNames, geneLabelMap } = store.getState()
    const varIndex = resolveGeneToVarIndex(config.gene, varNames, geneLabelMap)
    if (!varIndex) {
      return err({
        kind: 'field_value_invalid',
        field: 'gene',
        value: config.gene,
        reason: 'not found in dataset (checked var index and gene labels)',
      })
    }
    store.getState().setColorMode('gene')
    store.getState().selectGene(varIndex)
  } else if (config.colorBy === 'category' && config.category) {
    const { obsColumnNames } = store.getState()
    if (!obsColumnNames.includes(config.category)) {
      return err({
        kind: 'field_value_invalid',
        field: 'category',
        value: config.category,
        reason: 'not found in dataset',
      })
    }
    store.getState().setColorMode('category')
    store.getState().selectObsColumn(config.category)

    // Apply optional highlight subset. We need the categoryMap to be populated
    // (it's only ready after selectObsColumn's async fetch resolves) so we wait
    // on the store before translating labels → codes.
    if (config.highlightedCategories !== undefined) {
      try {
        await waitForStore(
          store,
          (s) => s.selectedObsColumn === config.category && s.categoryMap.length > 0,
        )
      } catch {
        return err({ kind: 'metadata_unavailable', field: 'highlightedCategories' })
      }
      const { categoryMap } = store.getState()
      const codes: number[] = []
      for (const label of config.highlightedCategories) {
        const idx = categoryMap.findIndex((c) => c.label === label)
        if (idx === -1) {
          return err({
            kind: 'field_value_invalid',
            field: 'highlightedCategories',
            value: label,
            reason: `not a value of category '${config.category}' (available: ${categoryMap.map((c) => c.label).join(', ')})`,
          })
        }
        codes.push(idx)
      }
      store.setState({ highlightedCategories: new Set(codes) })
      store.getState().rebuildColorBuffer()
    }
  }

  // 3d: Summary panel.
  // `null` on summaryObsColumns / summaryGenes clears the pinned list;
  // array adds each name (additive — current behavior).
  if (config.summaryObsColumns === null) {
    for (const col of [...store.getState().summaryObsColumns]) {
      store.getState().removeSummaryObsColumn(col)
    }
  } else if (config.summaryObsColumns) {
    const { obsColumnNames } = store.getState()
    for (const col of config.summaryObsColumns) {
      if (!obsColumnNames.includes(col)) {
        return err({
          kind: 'field_value_invalid',
          field: 'summaryObsColumns',
          value: col,
          reason: 'not found in dataset',
        })
      }
      store.getState().addSummaryObsColumn(col)
    }
  }
  // Per-name removal — independent of the add/clear path above.
  if (config.removeSummaryObsColumns) {
    for (const col of config.removeSummaryObsColumns) {
      store.getState().removeSummaryObsColumn(col)
    }
  }
  if (config.summaryGenes === null) {
    for (const gene of [...store.getState().summaryGenes]) {
      store.getState().removeSummaryGene(gene)
    }
  } else if (config.summaryGenes) {
    if (store.getState().geneLabelColumn && store.getState().geneLabelMap === null) {
      try {
        await waitForStore(store, (s) => s.geneLabelMap !== null)
      } catch {
        return err({ kind: 'metadata_unavailable', field: 'summaryGenes' })
      }
    }
    const { varNames, geneLabelMap } = store.getState()
    for (const gene of config.summaryGenes) {
      const varIndex = resolveGeneToVarIndex(gene, varNames, geneLabelMap)
      if (!varIndex) {
        return err({
          kind: 'field_value_invalid',
          field: 'summaryGenes',
          value: gene,
          reason: 'not found in dataset (checked var index and gene labels)',
        })
      }
      store.getState().addSummaryGene(varIndex)
    }
  }
  // Per-name removal for summary genes. Resolve symbol → var index if possible
  // (matches how addSummaryGene stores the canonical key); falls back to the
  // raw name otherwise. Unknown names are a silent no-op in the store.
  if (config.removeSummaryGenes) {
    const { varNames, geneLabelMap } = store.getState()
    for (const gene of config.removeSummaryGenes) {
      const varIndex = resolveGeneToVarIndex(gene, varNames, geneLabelMap)
      store.getState().removeSummaryGene(varIndex ?? gene)
    }
  }

  // 3e: Custom group filter
  if (config.filter && config.filter.ids.length > 0) {
    const { obsColumnNames } = store.getState()
    if (!obsColumnNames.includes(config.filter.obsColumn)) {
      return err({
        kind: 'field_value_invalid',
        field: 'filter.obsColumn',
        value: config.filter.obsColumn,
        reason: 'not found in dataset',
      })
    }
    store.getState().selectByIds(config.filter.obsColumn, config.filter.ids)
    // Default: when filter is set, switch summary to selections — UNLESS the
    // caller explicitly specified summaryContext (then their value wins).
    if (config.summaryContext === undefined) {
      store.setState({ summaryContext: 'selections' })
    }
  }

  // 3f: Expression-range filter
  if (config.filterByExpression) {
    const { gene, min, max } = config.filterByExpression
    if (min == null && max == null) {
      return err({
        kind: 'field_value_invalid',
        field: 'filterByExpression',
        value: config.filterByExpression,
        reason: 'specify at least one of min or max',
      })
    }
    if (min != null && max != null && min > max) {
      return err({
        kind: 'field_value_invalid',
        field: 'filterByExpression',
        value: { min, max },
        reason: `min (${min}) > max (${max})`,
      })
    }
    if (store.getState().geneLabelColumn && store.getState().geneLabelMap === null) {
      try {
        await waitForStore(store, (s) => s.geneLabelMap !== null)
      } catch {
        return err({ kind: 'metadata_unavailable', field: 'filterByExpression.gene' })
      }
    }
    const { varNames, geneLabelMap } = store.getState()
    const varIndex = resolveGeneToVarIndex(gene, varNames, geneLabelMap)
    if (!varIndex) {
      return err({
        kind: 'field_value_invalid',
        field: 'filterByExpression.gene',
        value: gene,
        reason: 'not found in dataset (checked var index and gene labels)',
      })
    }
    await store.getState().selectByExpression(varIndex, min ?? null, max ?? null)
    // Same convention as the ID-based filter: default summaryContext to 'selections'
    // unless the caller specified otherwise.
    if (config.summaryContext === undefined) {
      store.setState({ summaryContext: 'selections' })
    }
  }

  // Explicit summaryContext (always wins over implicit default).
  //
  // Vocabulary note: the AppConfig schema exposes 'overall' | 'selections' as
  // the external/agent-facing surface. The store internally uses 'all' |
  // 'selections' | 'compare'. We map 'overall' → 'all' here. The store's
  // 'compare' value is intentionally NOT exposed in the schema — it's a
  // UI-driven mode that the agent has no business setting.
  if (config.summaryContext !== undefined) {
    store.setState({
      summaryContext: config.summaryContext === 'overall' ? 'all' : config.summaryContext,
    })
  }

  // Selection display mode (applied AFTER filter phases so explicit value
  // overrides the 'hide' default that selectByIds / selectByExpression set
  // internally). Standalone field — does not require any filter to be set.
  if (config.selectionDisplayMode !== undefined) {
    store.getState().setSelectionDisplayMode(config.selectionDisplayMode)
  }

  // Rendering controls — map schema field names to store field names.
  // `null` is the reset sentinel: restore the store defaults (0.5 / 0.5).
  if (config.pointSize !== undefined) {
    store.setState({ pointRadius: config.pointSize ?? 0.5 })
  }
  if (config.opacity !== undefined) {
    store.setState({ opacity: config.opacity ?? 0.5 })
  }

  // Viewport — delegate to the store action.
  // setViewport(viewport) sets pendingViewport and bumps viewportEpoch.
  // setViewport(null) bumps too; View.tsx's epoch-watching effect computes a
  // fit-to-view target from the embedding bounds and applies via setProps.
  if (config.viewport !== undefined) {
    const { setViewport } = store.getState()
    setViewport(config.viewport)
  }

  return ok()
}
