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
  colorBy: z.enum(['gene', 'category']).optional(),
  gene: z.string().optional(),
  category: z.string().optional(),
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

  // viewport (tightly bound — nested, NEW)
  viewport: ViewportSchema.optional(),

  // rendering (flat, NEW)
  pointSize: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),

  // summary panel
  summaryObsColumns: z.array(z.string()).optional(),
  summaryGenes: z.array(z.string()).optional(),
  summaryContext: z.enum(['overall', 'selections']).optional(),

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
