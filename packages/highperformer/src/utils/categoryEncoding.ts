import { CATEGORICAL_COLORS, type RGB } from './colors'

export const MAX_CATEGORIES = 1000

// Uint16 ceiling: above this, per-cell codes would wrap, so colorby is blocked.
export const MAX_COLORABLE_CATEGORIES = 65535
// Above this many categories, color the plot but suppress the (un-virtualized)
// legend list and skip auto-pinning to the summary panel.
export const CATEGORY_LEGEND_LIST_CAP = 500

export interface CardinalityClass {
  colorable: boolean
  note: string | null
}

/**
 * Decide how to handle a colorby column of the given distinct-value count.
 * - <= palette length: color, no note.
 * - <= MAX_COLORABLE_CATEGORIES: color with the recycled palette + a note.
 * - otherwise: block (codes would wrap; likely an ID or continuous column).
 */
export function classifyCardinality(uniqueCount: number): CardinalityClass {
  if (uniqueCount <= CATEGORICAL_COLORS.length) {
    return { colorable: true, note: null }
  }
  if (uniqueCount <= MAX_COLORABLE_CATEGORIES) {
    return { colorable: true, note: `${uniqueCount} values — colors repeat` }
  }
  return {
    colorable: false,
    note: `${uniqueCount} distinct values — too many to color; likely an ID or continuous column`,
  }
}

export interface CategoryEncoding {
  codes: Uint16Array
  categoryMap: { label: string; color: RGB }[]
  uniqueCount: number
}

export function encodeCategories(values: (string | number | null)[]): CategoryEncoding {
  const labelToCode = new Map<string, number>()
  const codes = new Uint16Array(values.length)
  const numColors = CATEGORICAL_COLORS.length

  for (let i = 0; i < values.length; i++) {
    const label = String(values[i] ?? 'null')
    let code = labelToCode.get(label)
    if (code === undefined) {
      code = labelToCode.size
      labelToCode.set(label, code)
    }
    codes[i] = code
  }

  const categoryMap = Array.from(labelToCode.entries()).map(([label, code]) => ({
    label,
    color: CATEGORICAL_COLORS[code % numColors],
  }))

  return { codes, categoryMap, uniqueCount: labelToCode.size }
}
