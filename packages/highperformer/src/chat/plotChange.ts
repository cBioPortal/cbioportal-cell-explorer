/**
 * Config keys whose change shows on the plot itself. A chat `ui_action` that
 * sets any of them changes what the user is looking at; on a phone the chat
 * sheet steps aside so the change can be seen. Summary-panel keys are left
 * out — they change a panel, not the plot.
 */
const VISIBLE_KEYS = [
  'embedding',
  'colorBy',
  'gene',
  'category',
  'colorScaleName',
  'highlightedCategories',
  'filter',
  'filterByExpression',
  'viewport',
  'fitViewportToSelection',
  'selectionDisplayMode',
  'showCategoryLabels',
  'categoryLabelsObsColumn',
  'pointSize',
  'opacity',
] as const

/** Whether applying `cfg` changes the plot (presence counts; `null` clears are changes too). */
export function isVisiblePlotChange(cfg: Record<string, unknown>): boolean {
  return VISIBLE_KEYS.some((key) => key in cfg)
}
