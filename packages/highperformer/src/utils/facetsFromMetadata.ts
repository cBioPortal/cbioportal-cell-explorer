import type { FacetDef } from './facets'

/**
 * Turns a dataset's harvested obs columns into facet values.
 *
 * The backend marks columns with a canonical `facet` key, so `author_cell_type`
 * and `cell_type` both arrive as `cell_type`. Everything below is the judgement
 * the frontend applies on top of that designation — what makes a *usable*
 * filter, as opposed to what is technically categorical.
 */

export interface ObsColumn {
  name: string
  dtype: 'categorical' | 'numeric' | 'string'
  cardinality?: number | null
  values?: string[] | null
  facet?: string | null
}

/**
 * Above this a facet stops being a filter and becomes a list to scroll.
 *
 * Set against the live catalogue, where the useful facets and the useless ones
 * separate cleanly:
 *
 *   cell_type          87   the most important facet there is — must survive
 *   development_stage  90   "41-year-old stage" x90; an axis, not a filter
 *   donor             276   identifiers
 *   tissue             46
 *   disease            15
 *
 * 100 is the only round number that keeps cell_type and drops the other two.
 * It is close to development_stage at 90, so this will need revisiting rather
 * than trusting: the real distinction is identifier-versus-category, and
 * cardinality is only a proxy for it. If the backend ever stops marking
 * `donor_id` and `development_stage` as facets, the ceiling can go entirely.
 */
export const MAX_FACET_VALUES = 100

/**
 * Facets that are categorical but not *choices*.
 *
 * `development_stage` carries 90 values of the form "1-month-old stage",
 * "10-year-old stage", "11-month-old stage" — a continuous axis expressed as
 * strings. Sorted any way a facet can sort it reads as nonsense, and selecting
 * "children" would mean ticking dozens of boxes. It is a range control's job,
 * not a checklist's.
 *
 * Kept separate from the cardinality ceiling on purpose: the ceiling is a proxy
 * for "is this an identifier", and this is a different failure. A facet can be
 * small and still be the wrong shape.
 */
const NOT_A_CHOICE = new Set(['development_stage'])

/** Ordering for facets we know; anything else sorts after, alphabetically. */
const PREFERRED_ORDER = ['tissue', 'cell_type', 'disease', 'assay', 'sex', 'suspension_type']

/**
 * `cell_type` arrives from both `cell_type` (87 ontology labels — "B cell",
 * "CD14-positive monocyte") and `author_cell_type` (71 author shorthand —
 * "AE1", "AT1"). Unioned they make 157 values of mixed vocabulary, and
 * `disease` similarly picks up `condition`'s "TST" and "fresh", which are not
 * diseases.
 *
 * So where several columns claim one facet, the column named exactly like the
 * facet takes it — that is the standardised one. Only if none matches do the
 * others contribute, so a dataset carrying just `author_cell_type` still gets
 * cell types.
 */
export function facetValuesFor(columns: ObsColumn[]): Record<string, string[]> {
  const byFacet = new Map<string, ObsColumn[]>()
  for (const column of columns) {
    if (!column.facet || column.dtype !== 'categorical') continue
    if (!column.values || column.values.length === 0) continue
    const list = byFacet.get(column.facet)
    if (list) list.push(column)
    else byFacet.set(column.facet, [column])
  }

  const facets: Record<string, string[]> = {}
  for (const [key, candidates] of byFacet) {
    const canonical = candidates.find((c) => c.name === key)
    const chosen = canonical ? [canonical] : candidates

    const values = new Set<string>()
    for (const column of chosen) {
      for (const value of column.values ?? []) values.add(value)
    }
    if (values.size > 0) facets[key] = [...values]
  }
  return facets
}

/** "cell_type" → "Cell type". No manifest endpoint exists to supply labels. */
export function labelForFacet(key: string): string {
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The facets worth offering across a whole catalogue.
 *
 * The ceiling is applied here, over the union across datasets, rather than per
 * dataset: a facet is unusable if it is huge *in aggregate*, however few values
 * any single dataset contributes.
 */
export function facetDefsFrom(perDataset: Record<string, string[]>[]): FacetDef[] {
  const vocab = new Map<string, Set<string>>()
  for (const facets of perDataset) {
    for (const [key, values] of Object.entries(facets)) {
      const set = vocab.get(key) ?? new Set<string>()
      for (const value of values) set.add(value)
      vocab.set(key, set)
    }
  }

  return [...vocab.entries()]
    .filter(([key, values]) => !NOT_A_CHOICE.has(key) && values.size <= MAX_FACET_VALUES)
    .map(([key]) => {
      const index = PREFERRED_ORDER.indexOf(key)
      return { key, label: labelForFacet(key), order: index === -1 ? 1000 : index * 10 }
    })
    // Unknown facets share one order and are separated alphabetically here,
    // rather than by first character, which collided.
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
}
