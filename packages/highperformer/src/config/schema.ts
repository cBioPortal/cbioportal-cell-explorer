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
  geneLabelColumn: z.string().optional(),

  // filter (tightly bound — nested)
  filter: FilterSchema.optional(),

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
