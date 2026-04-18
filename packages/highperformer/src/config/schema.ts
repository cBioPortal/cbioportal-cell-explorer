import { z } from 'zod'

const FilterSchema = z.object({
  ids: z.array(z.string()),
  obsColumn: z.string(),
})

const MappedColumnSchema = z.object({
  label: z.string(),
  sourceColumn: z.string(),
  mapping: z.record(z.string(), z.string()),
})

const RawConfigSchema = z.object({
  url: z.string().optional(),
  dataset: z.string().optional(),
  embedding: z.string().optional(),
  colorBy: z.enum(['gene', 'category']).optional(),
  gene: z.string().optional(),
  category: z.string().optional(),
  geneLabelColumn: z.string().optional(),
  filter: FilterSchema.optional(),
  summaryObsColumns: z.array(z.string()).optional(),
  summaryGenes: z.array(z.string()).optional(),
  showHeader: z.boolean().default(true),
  showLeftSidebar: z.boolean().default(true),
  showRightSidebar: z.boolean().default(true),
  showDatasetDropdown: z.boolean().default(true),
  mappedColumns: z.array(MappedColumnSchema).optional(),
}).refine((data) => data.url || data.dataset, {
  message: 'Either "url" or "dataset" must be provided',
})

export const AppConfigSchema = RawConfigSchema.transform((data) => {
  // Strip colorBy if its companion field is missing
  if (data.colorBy === 'gene' && !data.gene) {
    console.warn('[config] colorBy "gene" requires a "gene" field — ignoring colorBy')
    const { colorBy, ...rest } = data
    return rest
  }
  if (data.colorBy === 'category' && !data.category) {
    console.warn('[config] colorBy "category" requires a "category" field — ignoring colorBy')
    const { colorBy, ...rest } = data
    return rest
  }
  return data
})

export type AppConfig = z.output<typeof AppConfigSchema>
export type MappedColumnDef = z.output<typeof MappedColumnSchema>

export const MessageSchema = z.object({
  type: z.literal('applyConfig'),
  payload: AppConfigSchema,
})

export type AppMessage = z.output<typeof MessageSchema>
