import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatasetStatus } from './DatasetStatus'
import useAppStore from '../store/useAppStore'
import type { DatasetLoadError } from '../store/datasetLoadError'
import { loginUrl } from '../utils/loginUrl'

function renderStatus(error: DatasetLoadError, onRetry = vi.fn()) {
  render(
    <MemoryRouter>
      <DatasetStatus error={error} onRetry={onRetry} />
    </MemoryRouter>,
  )
  return onRetry
}

function setContact(access_contact: string | null) {
  useAppStore.setState({ backendInfo: { auth_enabled: true, access_contact } as never })
}

const jo = { sub: 'u1', name: 'Jo Smith', email: 'jo@example.org', roles: [] }

describe('DatasetStatus', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('sign_in_required: private title, names the dataset, Sign in goes to login, offers browse', () => {
    renderStatus({ kind: 'sign_in_required', slug: 'p', name: 'Private Study' })
    expect(screen.getByText('This dataset is private')).toBeTruthy()
    expect(screen.getByText('Private Study')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe(loginUrl())
    expect(screen.getByRole('link', { name: /browse datasets/i }).getAttribute('href')).toBe('/')
  })

  it('no_access with a contact: Request access is a mailto with an encoded subject', () => {
    setContact('a@b.org')
    useAppStore.setState({ user: jo })
    renderStatus({ kind: 'no_access', slug: 'p', name: 'R&D: T cells?' })
    const href = screen.getByRole('link', { name: /request access/i }).getAttribute('href')
    expect(href).toBe('mailto:a@b.org?subject=Access%20request%3A%20R%26D%3A%20T%20cells%3F')
  })

  it('no_access without a contact: tells you to contact your administrator, no Request access', () => {
    setContact(null)
    useAppStore.setState({ user: jo })
    renderStatus({ kind: 'no_access', slug: 'p', name: 'Private Study' })
    expect(screen.getByText(/contact your administrator to request access/i)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /request access/i })).toBeNull()
  })

  it('no_access shows the signed-in account and a different-account link', () => {
    setContact(null)
    useAppStore.setState({ user: jo })
    renderStatus({ kind: 'no_access', slug: 'p', name: 'Private Study' })
    expect(screen.getByText('jo@example.org')).toBeTruthy()
    expect(screen.getByRole('link', { name: /sign in with a different account/i })).toBeTruthy()
  })

  it('session_expired asks to sign in again', () => {
    renderStatus({ kind: 'session_expired', slug: 'p', name: 'Private Study' })
    expect(screen.getByText('Your session has expired')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^sign in$/i })).toBeTruthy()
  })

  it('not_found names the slug and has no Try again', () => {
    renderStatus({ kind: 'not_found', slug: 'spectrum-ovarain' })
    expect(screen.getByText('Dataset not found')).toBeTruthy()
    expect(screen.getByText('spectrum-ovarain')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
  })

  it.each<DatasetLoadError>([
    { kind: 'unreachable' },
    { kind: 'unavailable', slug: 'p', name: 'P' },
    { kind: 'files_failed', slug: 'p', name: 'P', detail: 'boom' },
    { kind: 'store_failed', url: 'https://example.org/x.zarr', detail: 'boom' },
  ])('$kind offers Try again, which calls onRetry', (error) => {
    const onRetry = renderStatus(error)
    screen.getByRole('button', { name: /try again/i }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('access and not-found states never offer Try again', () => {
    for (const error of [
      { kind: 'sign_in_required', slug: 'p', name: null },
      { kind: 'session_expired', slug: 'p', name: null },
      { kind: 'no_access', slug: 'p', name: null },
      { kind: 'config_unreadable' },
    ] as DatasetLoadError[]) {
      renderStatus(error)
      expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
      cleanup()
    }
  })

  it('store_failed technical details include the url and the error', () => {
    renderStatus({ kind: 'store_failed', url: 'https://example.org/x.zarr', detail: 'TypeError: Failed to fetch' })
    expect(screen.getByText('https://example.org/x.zarr')).toBeTruthy()
    expect(screen.getByText('TypeError: Failed to fetch')).toBeTruthy()
  })

  it('falls back to the slug when the name is unknown', () => {
    renderStatus({ kind: 'sign_in_required', slug: 'private-study', name: null })
    expect(screen.getByText('private-study')).toBeTruthy()
  })

  it('embedded: no Browse datasets, and sign-in opens Cell Explorer in a new tab', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window)
    renderStatus({ kind: 'sign_in_required', slug: 'p', name: 'P' })
    expect(screen.queryByRole('link', { name: /browse datasets/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /^sign in$/i })).toBeNull()
    const open = screen.getByRole('link', { name: /open in cell explorer/i })
    expect(open.getAttribute('target')).toBe('_blank')
    expect(open.getAttribute('href')).toBe(window.location.href)
  })

  it('shows the header bar by default and hides it when showHeader is false', () => {
    renderStatus({ kind: 'not_found', slug: 'x' })
    expect(screen.getByText(/Cell Explorer/)).toBeTruthy()
    cleanup()
    useAppStore.setState({ showHeader: false })
    renderStatus({ kind: 'not_found', slug: 'x' })
    expect(screen.queryByText(/Cell Explorer/)).toBeNull()
  })
})
