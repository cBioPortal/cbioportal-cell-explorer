import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SiteFooter from './SiteFooter'

// This repo has no global test setup registering RTL auto-cleanup, so every
// component test unmounts explicitly — see CategoricalLegend.test.tsx:12.
afterEach(cleanup)

describe('SiteFooter', () => {
  it('always renders the cBioPortal attribution', () => {
    render(<SiteFooter />)
    expect(screen.getByText(/powered by cbioportal/i)).toBeTruthy()
  })

  it('renders the cBioPortal mark beside it', () => {
    render(<SiteFooter />)
    expect(screen.getByRole('img', { name: 'cBioPortal' })).toBeTruthy()
  })

  it('takes no props that could suppress or alter the attribution', () => {
    // The attribution is a fixed product decision, not configuration. If someone
    // later adds a prop to hide or reword it, this test is the tripwire.
    expect(SiteFooter.length).toBe(0)
  })
})
