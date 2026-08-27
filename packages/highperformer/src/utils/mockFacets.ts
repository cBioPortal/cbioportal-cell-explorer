import type { FacetDef } from './facets'

/**
 * Synthesised facet values over the **real** catalogue.
 *
 * The backend harvests `obs_columns` but only as names — `ObsColumnInfo`, which
 * carries values and cardinality, is wired to the chat context endpoint and not
 * to the catalogue. Until that changes there is no way to see the facet UI
 * against a real number of real datasets, and 13 fixture rows say nothing about
 * whether a sidebar works at 74.
 *
 * So this fills in only the missing half. Which facets a dataset has is taken
 * from its real `obs_columns`; only the values are invented, deterministically
 * from the slug so they never shift between loads.
 *
 * The values are plausible but fabricated — do not read anything scientific
 * into which datasets group together. Enabled by `VITE_MOCK_FACETS`, separate
 * from `VITE_MOCK_CATALOG` so "invent the whole catalogue" and "invent only the
 * facets" stay independent, and gated on DEV so neither reaches production.
 */

export const MOCK_FACETS_ENABLED =
  import.meta.env.DEV &&
  // Vitest runs with DEV true and loads .env.local, so without this a developer
  // toggling the fixture would silently change test results.
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_MOCK_FACETS === 'true'

export const MOCK_FACET_DEFS: FacetDef[] = [
  { key: 'tissue', label: 'Tissue', order: 10 },
  { key: 'cell_type', label: 'Cell type', order: 20 },
  { key: 'disease', label: 'Disease', order: 30 },
  { key: 'assay', label: 'Assay', order: 40 },
  { key: 'organism', label: 'Organism', order: 50 },
]

/** Deliberately 19 tissues, matching what SPECTRUM really carries, so the
 *  collapse and filter-within-facet behaviours get exercised. */
const VOCAB: Record<string, string[]> = {
  tissue: [
    'lung', 'breast', 'large intestine', 'lymph node', 'brain', 'blood',
    'ovary', 'omentum', 'caecum', 'bone marrow', 'liver', 'kidney',
    'pancreas', 'skin', 'thymus', 'spleen', 'prostate', 'uterus', 'oesophagus',
  ],
  cell_type: [
    'T cell', 'B cell', 'macrophage', 'monocyte', 'fibroblast',
    'endothelial cell', 'epithelial cell', 'natural killer cell',
    'dendritic cell', 'mast cell', 'plasma cell', 'neutrophil',
  ],
  disease: [
    'lung adenocarcinoma', 'breast carcinoma', 'colorectal cancer',
    'high-grade glioma', 'neuroblastoma', 'small cell lung carcinoma', 'normal',
  ],
  assay: ["10x 3' v3", "10x 5' v2", 'Slide-seq', 'snRNA-seq'],
  // One value everywhere, so the "hide facets that cannot discriminate" rule
  // has something real to hide.
  organism: ['Homo sapiens'],
}

/** How many values a dataset gets for a facet — enough spread to make counts interesting. */
const SPREAD: Record<string, number> = {
  tissue: 4,
  cell_type: 5,
  disease: 1,
  assay: 1,
  organism: 1,
}

function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function pick(vocab: string[], seed: string, count: number): string[] {
  const chosen: string[] = []
  let h = hash(seed)
  while (chosen.length < Math.min(count, vocab.length)) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const value = vocab[h % vocab.length]
    if (!chosen.includes(value)) chosen.push(value)
  }
  return chosen.sort()
}

interface HasMetadata {
  slug: string
  metadata?: { obs_columns?: string[] } | null
}

/**
 * `null` when the harvest has not run — there is nothing to base an answer on.
 * `{}` when it ran but the store declares none of the facet columns, which is
 * the genuinely-unannotated case this product exists to support.
 */
export function synthesizeFacets(
  dataset: HasMetadata,
): Record<string, string[]> | null {
  const columns = dataset.metadata?.obs_columns
  if (!dataset.metadata || !columns) return null

  const facets: Record<string, string[]> = {}
  for (const def of MOCK_FACET_DEFS) {
    // Presence mirrors the real store; only the values are invented.
    if (!columns.includes(def.key)) continue
    facets[def.key] = pick(VOCAB[def.key], `${dataset.slug}:${def.key}`, SPREAD[def.key])
  }
  return facets
}

export function withMockFacets<T extends HasMetadata>(datasets: T[]): T[] {
  return datasets.map((d) => ({ ...d, facets: synthesizeFacets(d) }))
}
