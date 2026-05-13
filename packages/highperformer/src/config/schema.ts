import { z } from 'zod'

const FilterSchema = z.object({
  ids: z.array(z.string()),
  obsColumn: z.string(),
})

const ViewportSchema = z.object({
  target: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
})

export const AppConfigSchema = z.object({
  // dataset source
  url: z.string().optional(),
  dataset: z.string().optional(),

  // data view
  embedding: z.string().optional(),
  // colorBy/gene/category: `null` is a reset sentinel ("clear coloring"); a
  // string sets the mode/value normally; absent = no change.
  colorBy: z.enum(['gene', 'category']).nullable().optional(),
  gene: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  // Continuous color scale for gene coloring. Categorical colors are
  // independent (palette built into the worker).
  colorScaleName: z.enum(['viridis', 'magma', 'plasma', 'inferno']).optional(),
  // Subset of category values to highlight (full-opacity); others render dimmed/gray.
  // Requires colorBy='category' + category. Labels are matched against the loaded
  // categoryMap; unknown labels yield a field_value_invalid error.
  highlightedCategories: z.array(z.string()).optional(),
  geneLabelColumn: z.string().optional(),

  // filter (tightly bound — nested)
  filter: FilterSchema.optional(),

  // Expression-range filter: select cells where `gene` expression is in [min, max].
  // null bounds mean -∞ / +∞. At least one bound must be set. Requires that `gene`
  // resolve to a known var index (symbol or raw index — same as `gene` field).
  filterByExpression: z.object({
    gene: z.string(),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
  }).optional(),

  // viewport (tightly bound — nested, NEW).
  // `null` = reset to fit-to-view (applied imperatively at runtime via
  // deckRef.setProps); object = explicit override; absent = no change.
  viewport: ViewportSchema.nullable().optional(),

  // Compute viewport from the current selection's bbox (positions of cells
  // where selectionFilterBuffer === 1) and apply. No-op if no selection is
  // active. Useful for "zoom into my filter" agent tool calls — the agent
  // doesn't have access to embedding coordinates, so it can't compute the
  // bbox itself.
  fitViewportToSelection: z.boolean().optional(),

  // rendering (flat, NEW).
  // `null` = reset to the store defaults (0.5 for both); number = override;
  // absent = no change.
  pointSize: z.number().positive().nullable().optional(),
  opacity: z.number().min(0).max(1).nullable().optional(),

  // summary panel.
  // summaryObsColumns / summaryGenes: array adds each name (additive);
  // `null` clears the entire pinned list. removeSummaryObsColumns /
  // removeSummaryGenes remove each named entry without touching the rest.
  summaryObsColumns: z.array(z.string()).nullable().optional(),
  summaryGenes: z.array(z.string()).nullable().optional(),
  removeSummaryObsColumns: z.array(z.string()).optional(),
  removeSummaryGenes: z.array(z.string()).optional(),
  summaryContext: z.enum(['overall', 'selections']).optional(),

  // Selection display: 'dim' keeps non-selected cells visible at low alpha,
  // 'hide' culls them entirely via deck.gl's DataFilterExtension. Applies AFTER
  // filter / filterByExpression so the explicit value wins over the 'hide'
  // default that ID-based filters set internally.
  selectionDisplayMode: z.enum(['dim', 'hide']).optional(),

  // Cluster label overlay on the scatterplot. Affects render only when
  // colorMode === 'category' and a category column is selected. Setting
  // true while in gene mode is allowed but has no visible effect until
  // the user switches to category mode.
  showCategoryLabels: z.boolean().optional(),

  // UI chrome
  showHeader: z.boolean().optional(),
  showLeftSidebar: z.boolean().optional(),
  showRightSidebar: z.boolean().optional(),
  showDatasetDropdown: z.boolean().optional(),
})

export type AppConfig = z.output<typeof AppConfigSchema>

export const MessageSchema = z.object({
  type: z.literal('applyConfig'),
  payload: AppConfigSchema,
})

export type AppMessage = z.output<typeof MessageSchema>
