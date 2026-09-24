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

  it('ignores any props passed to it', () => {
    // The attribution is a fixed product decision, not configuration. This is the
    // real tripwire: it fails the moment any prop is wired up to alter or suppress
    // the attribution, whatever that prop is called.
    // @ts-expect-error - intentionally passing unsupported props to prove they do nothing
    render(<SiteFooter hideAttribution suppress variant="hidden" />)
    expect(screen.getByText(/powered by cbioportal/i)).toBeTruthy()
  })

  it('declares no parameters', () => {
    // Secondary signal only. Function.length counts parameters BEFORE the first
    // one with a default, so `SiteFooter({ hide = false } = {})` would still
    // report 0 — which is why the behavioural test above is the actual guard.
    expect(SiteFooter.length).toBe(0)
  })
})
