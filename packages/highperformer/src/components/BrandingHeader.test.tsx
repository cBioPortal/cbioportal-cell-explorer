import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BrandingHeader from './BrandingHeader'
import { DEFAULT_BRAND, type ResolvedBrand } from '../hooks/useBrand'

afterEach(cleanup)

let brand: ResolvedBrand = DEFAULT_BRAND
vi.mock('../hooks/useBrand', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useBrand')>('../hooks/useBrand')
  return { ...actual, useBrand: () => brand }
})

function renderBar() {
  return render(
    <MemoryRouter>
      <BrandingHeader />
    </MemoryRouter>,
  )
}

describe('BrandingHeader', () => {
  it('reads "cBioPortal Cell Explorer" for an unbranded deployment', () => {
    brand = DEFAULT_BRAND
    renderBar()
    expect(screen.getByText(/cBioPortal Cell Explorer/)).toBeTruthy()
  })

  it('uses the operator name when branded', () => {
    brand = { ...DEFAULT_BRAND, name: 'Break Through Cancer', isDefault: false }
    renderBar()
    expect(screen.getByText(/Break Through Cancer Cell Explorer/)).toBeTruthy()
  })

  it('keeps "Cell Explorer" literal — the operator brands the identity, not the tool', () => {
    brand = { ...DEFAULT_BRAND, name: 'Acme', isDefault: false }
    renderBar()
    expect(screen.queryByText(/Acme$/)).toBeNull()
    expect(screen.getByText(/Acme Cell Explorer/)).toBeTruthy()
  })

  // Both states, because the regression this guards against is conditioning the
  // mark on isDefault — "attribution only for branded deployments", or the
  // reverse. A single-state test cannot see either direction.
  it.each([
    ['unbranded', DEFAULT_BRAND],
    ['branded', { ...DEFAULT_BRAND, name: 'Break Through Cancer', isDefault: false }],
  ])('always shows the cBioPortal attribution mark (%s)', (_label, b) => {
    brand = b as ResolvedBrand
    renderBar()
    expect(screen.getByRole('img', { name: 'Powered by cBioPortal' })).toBeTruthy()
  })
})
