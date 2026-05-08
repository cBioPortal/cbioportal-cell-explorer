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

  // Phase 3: Wait for dataset metadata (kept as-is for this task; restructured in Task 7)
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

  try {
    await waitForStore(store, (s) => s.obsColumnNames.length > 0)
  } catch {
    console.warn('[config] Timed out waiting for dataset metadata — skipping post-load config')
    return ok() // ← will become metadata_unavailable in Task 7
  }

  // 3a: Gene label column
  if (config.geneLabelColumn) {
    const { varColumns } = store.getState()
    if (varColumns.includes(config.geneLabelColumn)) {
      store.getState().setGeneLabelColumn(config.geneLabelColumn)
    } else {
      console.warn(`[config] geneLabelColumn "${config.geneLabelColumn}" not found in dataset var columns`)
    }
  }

  // 3b: Embedding
  if (config.embedding) {
    const { obsmKeys } = store.getState()
    if (obsmKeys.includes(config.embedding)) {
      store.getState().setSelectedEmbedding(config.embedding)
    } else {
      console.warn(`[config] embedding "${config.embedding}" not found — available: ${obsmKeys.join(', ')}`)
    }
  }

  // 3c: Color mapping (cross-field check moved to Task 5)
  if (config.colorBy === 'gene' && config.gene) {
    const { varNames } = store.getState()
    if (varNames.includes(config.gene)) {
      store.getState().setColorMode('gene')
      store.getState().selectGene(config.gene)
    } else {
      console.warn(`[config] gene "${config.gene}" not found in dataset`)
    }
  } else if (config.colorBy === 'category' && config.category) {
    const { obsColumnNames } = store.getState()
    if (obsColumnNames.includes(config.category)) {
      store.getState().setColorMode('category')
      store.getState().selectObsColumn(config.category)
    } else {
      console.warn(`[config] category column "${config.category}" not found in dataset`)
    }
  }

  // 3d: Summary panel
  if (config.summaryObsColumns) {
    const { obsColumnNames } = store.getState()
    for (const col of config.summaryObsColumns) {
      if (obsColumnNames.includes(col)) {
        store.getState().addSummaryObsColumn(col)
      } else {
        console.warn(`[config] summary obs column "${col}" not found`)
      }
    }
  }
  if (config.summaryGenes) {
    const { varNames } = store.getState()
    for (const gene of config.summaryGenes) {
      if (varNames.includes(gene)) {
        store.getState().addSummaryGene(gene)
      } else {
        console.warn(`[config] summary gene "${gene}" not found`)
      }
    }
  }

  // 3e: Custom group filter (side-effect cleanup in Task 7)
  if (config.filter && config.filter.ids.length > 0) {
    store.getState().selectByIds(config.filter.obsColumn, config.filter.ids)
    store.setState({ summaryContext: 'selections' })
  }

  return ok()
}
