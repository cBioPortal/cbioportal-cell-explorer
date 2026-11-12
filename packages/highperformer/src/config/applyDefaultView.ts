import useAppStore from '../store/useAppStore'
import { NARROW_MAX_WIDTH } from '../hooks/useNarrowLayout'
import { applyConfig } from './applyConfig'
import { waitForStore, DATASET_LOAD_TIMEOUT_MS } from './waitForStore'
import type { ApplyResult } from './applyResult'

/**
 * Most category labels a dataset's default view may show in the narrow (phone)
 * layout. Past this they cover the plot: the CRC atlas's 44 cell types fill a
 * phone screen with names.
 */
export const NARROW_LABEL_LIMIT = 12

/**
 * Apply a catalog dataset's default view.
 *
 * In the narrow layout, a view that turns category labels on has them held
 * back and turned on only once the label column is known to have at most
 * NARROW_LABEL_LIMIT values — off first, so a long list never flashes up.
 * Only the default is held back: labels turned on in Settings or by the chat
 * show regardless.
 */
export async function applyDefaultView(view: Record<string, unknown>): Promise<ApplyResult> {
  const narrow = window.matchMedia(`(max-width: ${NARROW_MAX_WIDTH}px)`).matches
  if (!narrow || view.showCategoryLabels !== true) return applyConfig(view)

  const result = await applyConfig({ ...view, showCategoryLabels: false })
  if (!result.ok) return result

  const column =
    (view.categoryLabelsObsColumn as string | undefined) ??
    (view.colorBy === 'category' ? (view.category as string | undefined) : undefined)
  if (!column) return result

  const count = (s: ReturnType<typeof useAppStore.getState>): number => {
    if (s.selectedObsColumn === column && s.categoryMap.length > 0) return s.categoryMap.length
    return s.summaryObsData.get(column)?.categoryMap.length ?? 0
  }
  try {
    await waitForStore(useAppStore, (s) => count(s) > 0, DATASET_LOAD_TIMEOUT_MS)
  } catch {
    // The column never loaded (or another dataset was opened): leave labels off.
    return result
  }
  if (count(useAppStore.getState()) <= NARROW_LABEL_LIMIT) {
    useAppStore.getState().setShowCategoryLabels(true)
  }
  return result
}
