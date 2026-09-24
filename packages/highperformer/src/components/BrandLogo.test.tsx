import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import BrandLogo from './BrandLogo'
import type { ResolvedBrand } from '../hooks/useBrand'
import { DEFAULT_BRAND } from '../hooks/useBrand'

let brand: ResolvedBrand = DEFAULT_BRAND
vi.mock('../hooks/useBrand', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useBrand')>('../hooks/useBrand')
  return { ...actual, useBrand: () => brand }
})

const btc: ResolvedBrand = {
  ...DEFAULT_BRAND,
  name: 'Break Through Cancer',
  logoOnDark: '/brand/btc-logo-white.svg',
  logoOnLight: '/brand/btc-logo.svg',
  logoAlt: 'Break Through Cancer',
  logoHref: null,
  isDefault: false,
}

describe('BrandLogo', () => {
  afterEach(() => cleanup())

  it('renders the cBioPortal mark when no logo is configured', () => {
    brand = DEFAULT_BRAND
    render(<BrandLogo />)
    expect(screen.getByRole('img', { name: 'cBioPortal' })).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders the operator logo when one is configured', () => {
    brand = btc
    render(<BrandLogo variant="onDark" />)
    const img = screen.getByAltText('Break Through Cancer') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/brand/btc-logo-white.svg')
  })

  it('picks the light variant when asked', () => {
    brand = btc
    render(<BrandLogo variant="onLight" />)
    const img = screen.getByAltText('Break Through Cancer') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/brand/btc-logo.svg')
  })

  it('falls back to the mark when the requested variant is missing', () => {
    // An operator may supply only the dark variant; the light surface must not break.
    brand = { ...btc, logoOnLight: null }
    render(<BrandLogo variant="onLight" />)
    expect(screen.getByRole('img', { name: 'Break Through Cancer' })).toBeTruthy()
  })

  it('wraps the logo in a link only when logoHref is set', () => {
    brand = { ...btc, logoHref: 'https://breakthroughcancer.org' }
    render(<BrandLogo />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://breakthroughcancer.org')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('does not render a link when logoHref is absent', () => {
    brand = btc
    render(<BrandLogo />)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
