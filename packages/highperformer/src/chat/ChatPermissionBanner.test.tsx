import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChatPermissionBanner } from './ChatPermissionBanner'

describe('ChatPermissionBanner', () => {
  it('renders sign-in CTA for requires_auth', () => {
    render(<ChatPermissionBanner reason="requires_auth" />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeDefined()
  })

  it('renders contact-admin copy for missing_role', () => {
    render(<ChatPermissionBanner reason="missing_role:cell-explorer-chat" />)
    expect(screen.getByText(/cell-explorer-chat/)).toBeDefined()
    expect(screen.getByText(/administrator/i)).toBeDefined()
  })

  it('renders a generic fallback for unknown reasons', () => {
    render(<ChatPermissionBanner reason="some-future-reason" />)
    expect(screen.getByText(/not available for your account/i)).toBeDefined()
  })
})
