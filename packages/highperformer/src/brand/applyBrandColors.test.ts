import { describe, expect, it } from 'vitest'
import { applyBrandColors } from './applyBrandColors'
import { DEFAULT_BRAND, type ResolvedBrand } from '../hooks/useBrand'

const btc: ResolvedBrand = {
  ...DEFAULT_BRAND,
  colors: { ink: '#240D00', inkDeep: null, themeColor: '#240D00' },
  isDefault: false,
}

function root() {
  return document.createElement('div')
}

describe('applyBrandColors', () => {
  it('sets nothing for the default brand', () => {
    // An unbranded deployment must be pixel-identical to today: the authored
    // literals in index.css stay in force and JS never overrides them.
    const el = root()
    applyBrandColors(DEFAULT_BRAND, el)
    expect(el.style.getPropertyValue('--ink')).toBe('')
    expect(el.style.getPropertyValue('--on-ink')).toBe('')
  })

  it('sets ink from the brand', () => {
    const el = root()
    applyBrandColors(btc, el)
    expect(el.style.getPropertyValue('--ink')).toBe('#240D00')
  })

  it('derives ink-deep when the brand does not supply one', () => {
    const el = root()
    applyBrandColors(btc, el)
    expect(el.style.getPropertyValue('--ink-deep')).toBe(
      'color-mix(in srgb, #240D00 65%, black)',
    )
  })

  it('prefers an explicit inkDeep over the derived one', () => {
    const el = root()
    applyBrandColors({ ...btc, colors: { ...btc.colors, inkDeep: '#120600' } }, el)
    expect(el.style.getPropertyValue('--ink-deep')).toBe('#120600')
  })

  it('derives the on-ink text colors from ink', () => {
    const el = root()
    applyBrandColors(btc, el)
    expect(el.style.getPropertyValue('--on-ink')).toBe(
      'color-mix(in srgb, white 94%, #240D00)',
    )
    expect(el.style.getPropertyValue('--on-ink-muted')).toBe(
      'color-mix(in srgb, white 62%, #240D00)',
    )
  })

  it('ignores a malformed ink rather than writing it into CSS', () => {
    // The backend validates, but the frontend must not be the weak link: a value
    // that is not #RRGGBB never reaches setProperty.
    const el = root()
    applyBrandColors({ ...btc, colors: { ...btc.colors, ink: 'red; --x: y' } }, el)
    expect(el.style.getPropertyValue('--ink')).toBe('')
  })
})
