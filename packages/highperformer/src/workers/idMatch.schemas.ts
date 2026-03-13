import { z } from 'zod'

const MatchByIdsMsgSchema = z.object({
  type: z.literal('matchByIds'),
  values: z.array(z.union([z.string(), z.number(), z.null()])),
  targetIds: z.array(z.string()),
  version: z.number(),
})

export const IdMatchMessageSchema = MatchByIdsMsgSchema

export const IdMatchResultSchema = z.object({
  type: z.literal('matchByIdsResult'),
  indices: z.custom<Uint32Array>((v) => v instanceof Uint32Array),
  matchedIds: z.array(z.string()),
  unmatchedIds: z.array(z.string()),
  version: z.number(),
})

export type IdMatchMessage = z.infer<typeof IdMatchMessageSchema>
export type IdMatchResult = z.infer<typeof IdMatchResultSchema>
