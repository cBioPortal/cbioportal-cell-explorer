import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn().mockResolvedValue({ data: undefined }) } }))
vi.mock('../utils/datasetProbe', () => ({ probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3 }) }))

import DatasetList from './DatasetList'

afterEach(() => cleanup())

const DATASET = {
  slug: 'ds1',
  name: 'Dataset One',
  description: 'First one',
  is_public: true,
  url: 'https://cdn/ds1.zarr',
  chat_enabled: false,
}

describe('DatasetList', () => {
  it('renders a row per dataset with its name and description', () => {
    render(<MemoryRouter><DatasetList datasets={[DATASET]} /></MemoryRouter>)
    expect(screen.getByText('Dataset One')).toBeDefined()
    expect(screen.getByText('First one')).toBeDefined()
  })

  it('shows the public access label', () => {
    render(<MemoryRouter><DatasetList datasets={[DATASET]} /></MemoryRouter>)
    expect(screen.getByText(/Public/)).toBeDefined()
  })

  it('renders the supplied empty text when there are no datasets', () => {
    render(<MemoryRouter><DatasetList datasets={[]} emptyText="Nothing here" /></MemoryRouter>)
    expect(screen.getByText('Nothing here')).toBeDefined()
  })
})
