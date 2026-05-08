import { AppConfigSchema, type AppConfig } from './schema'
import useAppStore from '../store/useAppStore'
import { waitForStore } from './waitForStore'
import { ok, err, type ApplyResult } from './applyResult'

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
    config.colorBy ||
    config.geneLabelColumn ||
    config.filter ||
    config.summaryObsColumns ||
    config.summaryGenes ||
    config.viewport ||
    config.pointSize !== undefined ||
    config.opacity !== undefined ||
    config.summaryContext

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

  // 3c: Color mapping (cross-field check moved to Task 5)
  if (config.colorBy === 'gene' && config.gene) {
    const { varNames } = store.getState()
    if (!varNames.includes(config.gene)) {
      return err({
        kind: 'field_value_invalid',
        field: 'gene',
        value: config.gene,
        reason: 'not found in dataset',
      })
    }
    store.getState().setColorMode('gene')
    store.getState().selectGene(config.gene)
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
  }

  // 3d: Summary panel
  if (config.summaryObsColumns) {
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
  if (config.summaryGenes) {
    const { varNames } = store.getState()
    for (const gene of config.summaryGenes) {
      if (!varNames.includes(gene)) {
        return err({
          kind: 'field_value_invalid',
          field: 'summaryGenes',
          value: gene,
          reason: 'not found in dataset',
        })
      }
      store.getState().addSummaryGene(gene)
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

  // Explicit summaryContext (always wins over implicit default)
  if (config.summaryContext !== undefined) {
    store.setState({ summaryContext: config.summaryContext })
  }

  // Rendering controls — map schema field names to store field names
  if (config.pointSize !== undefined) {
    store.setState({ pointRadius: config.pointSize })
  }
  if (config.opacity !== undefined) {
    store.setState({ opacity: config.opacity })
  }

  // Viewport — delegate to the store action (talks to deck.gl on next mount)
  if (config.viewport !== undefined) {
    const { setViewport } = store.getState()
    setViewport(config.viewport)
  }

  return ok()
}
