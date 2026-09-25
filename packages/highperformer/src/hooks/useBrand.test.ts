import { describe, expect, it } from 'vitest'
import { DEFAULT_BRAND, resolveBrand } from './useBrand'

const full = {
  name: 'Break Through Cancer',
  short_name: 'BTC',
  // Deliberately DIFFERENT from DEFAULT_BRAND.tagline: if `resolveBrand` were
  // changed to fall back to the default tagline instead of passing the
  // backend's through, a fixture that reused the default value would not
  // catch it — every assertion would still pass.
  tagline: 'Explore BTC cells.',
  logo_href: 'https://breakthroughcancer.org',
  logo_on_light: '/brand/btc-logo.svg',
  logo_on_dark: '/brand/btc-logo-white.svg',
  logo_alt: 'Break Through Cancer',
  colors: { ink: '#240D00', ink_deep: null, theme_color: '#240D00' },
}

describe('resolveBrand', () => {
  it('returns the cBioPortal defaults when the backend sends no brand', () => {
    expect(resolveBrand(null)).toEqual(DEFAULT_BRAND)
  })

  it('marks the default brand as default', () => {
    expect(resolveBrand(null).isDefault).toBe(true)
    expect(resolveBrand(full).isDefault).toBe(false)
  })

  it('translates snake_case to camelCase', () => {
    const b = resolveBrand(full)
    expect(b.logoOnDark).toBe('/brand/btc-logo-white.svg')
    expect(b.logoOnLight).toBe('/brand/btc-logo.svg')
    expect(b.logoAlt).toBe('Break Through Cancer')
    expect(b.logoHref).toBe('https://breakthroughcancer.org')
    expect(b.colors.themeColor).toBe('#240D00')
    expect(b.name).toBe('Break Through Cancer')
    expect(b.tagline).toBe('Explore BTC cells.')
    expect(b.colors.ink).toBe('#240D00')
  })

  it('never returns undefined fields', () => {
    // Consumers must not have to guard. Every key is present on every path.
    for (const brand of [resolveBrand(null), resolveBrand(full)]) {
      for (const [key, value] of Object.entries(brand)) {
        expect(value, `${key} is undefined`).not.toBeUndefined()
      }
    }
  })

  it('represents an unset logo as null, not undefined', () => {
    const b = resolveBrand({ ...full, logo_on_dark: null, logo_href: null })
    expect(b.logoOnDark).toBeNull()
    expect(b.logoHref).toBeNull()
  })

  it('represents an unset inkDeep as null so the caller can derive one', () => {
    expect(resolveBrand(full).colors.inkDeep).toBeNull()
  })

  it('passes an explicit inkDeep through', () => {
    const b = resolveBrand({ ...full, colors: { ...full.colors, ink_deep: '#120600' } })
    expect(b.colors.inkDeep).toBe('#120600')
  })

  it('uses the backend name even when it matches a default field', () => {
    const b = resolveBrand({ ...full, name: 'cBioPortal' })
    expect(b.name).toBe('cBioPortal')
    expect(b.isDefault).toBe(false) // a branded deployment that happens to share the name
  })

  it('rejects a javascript: logoHref rather than let it reach an <a href>', () => {
    // React ships whatever it is given as an href attribute (it only warns
    // at dev time on javascript:), so a hostile or corrupted brand bundle
    // must be caught here, not trusted through to BrandLogo.
    const b = resolveBrand({ ...full, logo_href: 'javascript:alert(1)' })
    expect(b.logoHref).toBeNull()
  })

  it('passes through a valid https: logoHref', () => {
    const b = resolveBrand({ ...full, logo_href: 'https://breakthroughcancer.org' })
    expect(b.logoHref).toBe('https://breakthroughcancer.org')
  })

  it('matches the backend defaults exactly', () => {
    // This pins the frontend's own DEFAULT_BRAND literals against accidental
    // edit. It does NOT compare against the backend — the backend's defaults
    // live in another repo and are never consulted here, so a divergence
    // between the two would not be caught by this test.
    expect(DEFAULT_BRAND.name).toBe('cBioPortal')
    expect(DEFAULT_BRAND.tagline).toBe('Explore millions of cells in your browser.')
    expect(DEFAULT_BRAND.colors.ink).toBe('#0d2c48')
    expect(DEFAULT_BRAND.colors.themeColor).toBe('#123a5e')
    expect(DEFAULT_BRAND.logoOnDark).toBeNull()
  })
})
