import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { DatasetError } from './DatasetError'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('DatasetError', () => {
  afterEach(cleanup)

  it('renders error message', () => {
    renderWithRouter(<DatasetError error="Network error" url="https://example.com/data.zarr" onRetry={() => {}} />)
    expect(screen.getByText('Network error')).toBeDefined()
  })

  it('renders the failed URL', () => {
    renderWithRouter(<DatasetError error="Not found" url="https://example.com/data.zarr" onRetry={() => {}} />)
    expect(screen.getByText('https://example.com/data.zarr')).toBeDefined()
  })

  it('renders retry button', () => {
    renderWithRouter(<DatasetError error="Failed" url="https://example.com/data.zarr" onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    renderWithRouter(<DatasetError error="Failed" url="https://example.com/data.zarr" onRetry={onRetry} />)
    screen.getByRole('button', { name: /retry/i }).click()
    expect(onRetry).toHaveBeenCalled()
  })

  it('renders home link when showHomeLink is true', () => {
    renderWithRouter(<DatasetError error="Failed" url="https://example.com/data.zarr" onRetry={() => {}} showHomeLink />)
    expect(screen.getByText(/home/i)).toBeDefined()
  })

  it('does not render home link when showHomeLink is false', () => {
    renderWithRouter(<DatasetError error="Failed" url="https://example.com/data.zarr" onRetry={() => {}} showHomeLink={false} />)
    expect(screen.queryByText(/home/i)).toBeNull()
  })
})
