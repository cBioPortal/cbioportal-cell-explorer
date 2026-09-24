import { render, screen, cleanup } from '@testing-library/react'
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
})
