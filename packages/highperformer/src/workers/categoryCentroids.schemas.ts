import { z } from "zod";

export const CategoryCentroidsMessageSchema = z.object({
  type: z.literal("categoryCentroids"),
  positions: z.custom<Float32Array>((v) => v instanceof Float32Array),
  codes: z.custom<Uint8Array>((v) => v instanceof Uint8Array),
  numCategories: z.number().int().positive(),
});

export const CategoryCentroidsResultSchema = z.object({
  type: z.literal("categoryCentroidsResult"),
  positions: z.custom<Float32Array>((v) => v instanceof Float32Array),
  counts: z.custom<Uint32Array>((v) => v instanceof Uint32Array),
});

export type CategoryCentroidsMessage = z.infer<typeof CategoryCentroidsMessageSchema>;
export type CategoryCentroidsResult = z.infer<typeof CategoryCentroidsResultSchema>;
