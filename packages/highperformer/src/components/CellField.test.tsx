import { render, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import CellField from './CellField'
import { t } from './landingTokens'
import type { ResolvedBrand } from '../hooks/useBrand'
import { DEFAULT_BRAND } from '../hooks/useBrand'

let brand: ResolvedBrand = DEFAULT_BRAND
vi.mock('../hooks/useBrand', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useBrand')>('../hooks/useBrand')
  return { ...actual, useBrand: () => brand }
})

const btc: ResolvedBrand = {
  ...DEFAULT_BRAND,
  colors: { ink: '#240D00', inkDeep: null, themeColor: '#240D00' },
  isDefault: false,
}

describe('CellField', () => {
  afterEach(() => cleanup())

  it('paints the gradient scrim from the built-in ink when unbranded', () => {
    brand = DEFAULT_BRAND
    const { container } = render(<CellField />)
    const stops = container.querySelectorAll('stop')
    expect(stops).toHaveLength(3)
    for (const stop of stops) {
      expect(stop.getAttribute('stop-color')).toBe(t.ink)
    }
  })

  it('paints the gradient scrim from the brand ink rather than the built-in navy', () => {
    brand = btc
    const { container } = render(<CellField />)
    const stops = container.querySelectorAll('stop')
    expect(stops).toHaveLength(3)
    for (const stop of stops) {
      expect(stop.getAttribute('stop-color')).toBe('#240D00')
      expect(stop.getAttribute('stop-color')).not.toBe(t.ink)
    }
  })
})
