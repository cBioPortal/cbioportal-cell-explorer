import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserAvatar from './UserAvatar'
import useAppStore from '../store/useAppStore'
import { signOut, switchAccount } from '../utils/session'

vi.mock('../utils/session', () => ({ signOut: vi.fn(), switchAccount: vi.fn() }))

const jo = { sub: 'u1', name: 'Jo Smith', email: 'jo@example.org', roles: [] }

function openMenu() {
  render(<UserAvatar />)
  fireEvent.click(screen.getByText('JS'))
}

describe('UserAvatar', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...useAppStore.getInitialState(),
      backendInfo: { auth_enabled: true } as never,
      authChecked: true,
      user: jo,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('menu shows who is signed in, Switch account and Sign out', async () => {
    openMenu()
    expect(await screen.findByText('Jo Smith')).toBeTruthy()
    expect(screen.getByText('jo@example.org')).toBeTruthy()
    expect(screen.getByRole('button', { name: /switch account/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy()
  })

  it('Sign out signs out', async () => {
    openMenu()
    fireEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(switchAccount).not.toHaveBeenCalled()
  })

  it('Switch account switches account', async () => {
    openMenu()
    fireEvent.click(await screen.findByRole('button', { name: /switch account/i }))
    expect(switchAccount).toHaveBeenCalledOnce()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('signed out shows Sign in', () => {
    useAppStore.setState({ user: null })
    render(<UserAvatar />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy()
  })
})
