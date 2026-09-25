import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SiteHeader from './SiteHeader'
import { DEFAULT_BRAND, type ResolvedBrand } from '../hooks/useBrand'

afterEach(cleanup)

let brand: ResolvedBrand = DEFAULT_BRAND
vi.mock('../hooks/useBrand', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useBrand')>('../hooks/useBrand')
  return { ...actual, useBrand: () => brand }
})

function renderHeader() {
  return render(
    <MemoryRouter>
      <SiteHeader stats={[]} />
    </MemoryRouter>,
  )
}

// Distinct from DEFAULT_BRAND in name/logoAlt on purpose: the BrandLogo
// branch takes its accessible name from logoAlt when a logo is configured,
// and from `name` when it falls back to the built-in mark. Neither equals
// "cBioPortal", so a query for the attribution's own mark (hardcoded
// title="cBioPortal" in SiteHeader) can never accidentally match the
// deployment's own logo/mark instead. See BrandLogo.test.tsx for the same
// convention.
const btc: ResolvedBrand = {
  ...DEFAULT_BRAND,
  name: 'Break Through Cancer',
  tagline: 'Explore BTC cells.',
  logoOnDark: '/brand/btc-logo-white.svg',
  logoOnLight: '/brand/btc-logo.svg',
  logoAlt: 'BTC logo',
  logoHref: null,
  isDefault: false,
}

describe('SiteHeader', () => {
  it('renders the default tagline for an unbranded deployment', () => {
    brand = DEFAULT_BRAND
    renderHeader()
    expect(screen.getByText(DEFAULT_BRAND.tagline)).toBeTruthy()
  })

  it('renders the operator tagline when branded', () => {
    // Distinct from DEFAULT_BRAND.tagline on purpose: nothing here would fail
    // if SiteHeader.tsx reverted to a hardcoded string unless the assertion
    // depends on a value the default does not also produce.
    brand = { ...DEFAULT_BRAND, tagline: 'Explore BTC cells.', isDefault: false }
    renderHeader()
    const tagline = document.querySelector('.ce-tagline')
    expect(tagline?.textContent).toBe('Explore BTC cells.')
  })

  it('renders the cBioPortal attribution text when unbranded', () => {
    brand = DEFAULT_BRAND
    renderHeader()
    expect(screen.getByText(/powered by cbioportal/i)).toBeTruthy()
  })

  it('renders the cBioPortal attribution text when branded', () => {
    // Half 1 of the contract: the attribution text is fixed and must render
    // in both brand states. It must never become suppressible.
    brand = btc
    renderHeader()
    expect(screen.getByText(/powered by cbioportal/i)).toBeTruthy()
  })

  it('renders the cBioPortal mark beside the attribution when branded', () => {
    // Half 2 of the contract: the mark is conditional on isDefault. Scoped to
    // .ce-poweredby specifically (not just role+name) so this cannot be
    // satisfied by the deployment's own logo/mark living elsewhere in the
    // lockup — see the `btc` fixture comment for why their accessible names
    // never collide.
    brand = btc
    const { container } = renderHeader()
    const poweredBy = within(container.querySelector('.ce-poweredby') as HTMLElement)
    expect(poweredBy.getByRole('img', { name: 'cBioPortal' })).toBeTruthy()
  })

  it('does not render the cBioPortal mark beside the attribution when unbranded', () => {
    // Unbranded, BrandLogo's own fallback mark is ALSO an <svg role="img"
    // aria-label="cBioPortal"> (title defaults to brand.name, which is
    // "cBioPortal" for DEFAULT_BRAND) — so a query against the whole header
    // for role=img name=cBioPortal would find that one and pass even if the
    // attribution wrongly rendered its own mark too. Scoping to .ce-poweredby
    // excludes the logo entirely and tests only the attribution's own mark.
    brand = DEFAULT_BRAND
    const { container } = renderHeader()
    const poweredBy = within(container.querySelector('.ce-poweredby') as HTMLElement)
    expect(poweredBy.queryByRole('img', { name: 'cBioPortal' })).toBeNull()
  })

  it('does not suppress the attribution text via arbitrary unsupported props', () => {
    // The attribution is a fixed product decision, not configuration. `stats`
    // is a real prop, so an arity check proves nothing here — this is the
    // real tripwire: it fails the moment any prop is wired up to alter or
    // suppress the attribution, whatever that prop is called.
    brand = DEFAULT_BRAND
    render(
      <MemoryRouter>
        {/* @ts-expect-error - intentionally passing unsupported props to prove they do nothing */}
        <SiteHeader stats={[]} hideAttribution suppress variant="hidden" />
      </MemoryRouter>,
    )
    expect(screen.getByText(/powered by cbioportal/i)).toBeTruthy()
  })
})
