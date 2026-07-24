import { describe, it, expect } from 'vitest'
import { encodeCategories, MAX_CATEGORIES, classifyCardinality, MAX_COLORABLE_CATEGORIES, CATEGORY_LEGEND_LIST_CAP } from './categoryEncoding'
import { CATEGORICAL_COLORS } from './colors'

describe('encodeCategories', () => {
  it('encodes string values to sequential integer codes', () => {
    const values = ['A', 'B', 'A', 'C', 'B']
    const result = encodeCategories(values)

    expect(result.codes).toBeInstanceOf(Uint16Array)
    expect(result.codes.length).toBe(5)
    // Same strings get same codes
    expect(result.codes[0]).toBe(result.codes[2]) // A === A
    expect(result.codes[1]).toBe(result.codes[4]) // B === B
    // Different strings get different codes
    expect(result.codes[0]).not.toBe(result.codes[1])
  })

  it('builds a categoryMap with labels and colors', () => {
    const values = ['cat', 'dog', 'cat']
    const result = encodeCategories(values)

    expect(result.categoryMap).toHaveLength(2)
    expect(result.categoryMap[0].label).toBe('cat')
    expect(result.categoryMap[0].color).toEqual(CATEGORICAL_COLORS[0])
    expect(result.categoryMap[1].label).toBe('dog')
    expect(result.categoryMap[1].color).toEqual(CATEGORICAL_COLORS[1])
  })

  it('returns uniqueCount', () => {
    const values = ['A', 'B', 'C', 'A']
    const result = encodeCategories(values)
    expect(result.uniqueCount).toBe(3)
  })

  it('handles numeric values by converting to string', () => {
    const values = [1, 2, 1, 3] as unknown as (string | number | null)[]
    const result = encodeCategories(values)
    expect(result.uniqueCount).toBe(3)
    expect(result.codes.length).toBe(4)
  })

  it('handles null values with a "null" category', () => {
    const values = ['A', null, 'A'] as (string | number | null)[]
    const result = encodeCategories(values)
    expect(result.uniqueCount).toBe(2)
    expect(result.codes.length).toBe(3)
  })

  it('wraps colors via modulo at the palette length', () => {
    const n = CATEGORICAL_COLORS.length
    const values = Array.from({ length: n + 3 }, (_, i) => `cat_${i}`)
    const result = encodeCategories(values)
    expect(result.uniqueCount).toBe(n + 3)
    // The (n+1)th category recycles the first color.
    expect(result.categoryMap[n].color).toEqual(CATEGORICAL_COLORS[0])
    // The category just before the wrap uses the last palette color.
    expect(result.categoryMap[n - 1].color).toEqual(CATEGORICAL_COLORS[n - 1])
  })

  it('exports MAX_CATEGORIES as 1000', () => {
    expect(MAX_CATEGORIES).toBe(1000)
  })

  it('assigns distinct codes beyond 256 categories (no Uint8 wrap)', () => {
    const values = Array.from({ length: 300 }, (_, i) => `cat_${i}`)
    const result = encodeCategories(values)
    expect(result.uniqueCount).toBe(300)
    // The 257th category (code 256) must be distinct from the first (code 0).
    expect(result.codes[256]).toBe(256)
    expect(result.codes[0]).toBe(0)
    expect(result.codes[256]).not.toBe(result.codes[0])
  })
})

describe('classifyCardinality', () => {
  it('colors with no note at or below the palette length', () => {
    expect(classifyCardinality(CATEGORICAL_COLORS.length)).toEqual({ colorable: true, note: null })
    expect(classifyCardinality(1)).toEqual({ colorable: true, note: null })
  })

  it('colors with a repeat note between palette length and the colorable ceiling', () => {
    const r = classifyCardinality(CATEGORICAL_COLORS.length + 1)
    expect(r.colorable).toBe(true)
    expect(r.note).toContain('colors repeat')

    const hi = classifyCardinality(MAX_COLORABLE_CATEGORIES)
    expect(hi.colorable).toBe(true)
    expect(hi.note).toContain('colors repeat')
  })

  it('blocks above the colorable ceiling', () => {
    const r = classifyCardinality(MAX_COLORABLE_CATEGORIES + 1)
    expect(r.colorable).toBe(false)
    expect(r.note).toContain('too many to color')
  })

  it('exposes the expected constants', () => {
    expect(MAX_COLORABLE_CATEGORIES).toBe(65535)
    expect(CATEGORY_LEGEND_LIST_CAP).toBe(500)
  })
})
