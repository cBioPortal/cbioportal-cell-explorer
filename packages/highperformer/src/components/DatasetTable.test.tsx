import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn().mockResolvedValue({ data: undefined }) } }))
vi.mock('../utils/datasetProbe', () => ({ probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3 }) }))

import DatasetTable from './DatasetTable'
import { catalogToEntry, localToEntry } from '../utils/datasetEntries'

afterEach(() => cleanup())

const DATASET = {
  slug: 'ds1',
  name: 'Dataset One',
  description: 'First one',
  is_public: true,
  url: 'https://cdn/ds1.zarr',
  chat_enabled: false,
}

type TableProps = Parameters<typeof DatasetTable>[0]

const renderTable = (props: Omit<TableProps, 'probes' | 'resolved'> & Partial<TableProps>) =>
  render(
    <MemoryRouter>
      <DatasetTable probes={new Map()} resolved={new Map()} {...props} />
    </MemoryRouter>,
  )

describe('DatasetTable', () => {
  it('renders a row per dataset with its name and description', () => {
    renderTable({ entries: [catalogToEntry(DATASET)] })
    expect(screen.getByText('Dataset One')).toBeDefined()
    expect(screen.getByText('First one')).toBeDefined()
  })

  it('shows the public access label', () => {
    renderTable({ entries: [catalogToEntry(DATASET)] })
    expect(screen.getByText(/Public/)).toBeDefined()
  })

  it('renders the supplied empty text when there are no datasets', () => {
    renderTable({ entries: [], emptyText: 'Nothing here' })
    expect(screen.getByText('Nothing here')).toBeDefined()
  })

  it('tags a locally added URL and names it after its last path segment', () => {
    renderTable({ entries: [localToEntry('https://cdn/my-atlas.zarr')] })
    expect(screen.getByText('my-atlas.zarr')).toBeDefined()
    expect(screen.getByText('Local')).toBeDefined()
  })

  it('shows the collection a catalog dataset belongs to', () => {
    const grouped = { ...DATASET, collection: { slug: 'lung', name: 'Lung' } }
    renderTable({ entries: [catalogToEntry(grouped)] })
    expect(screen.getByText('Lung')).toBeDefined()
  })

  it('renders a header for every column', () => {
    renderTable({ entries: [catalogToEntry(DATASET)] })
    for (const label of ['Dataset', 'Collection', 'Cells', 'Genes', 'Status']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(label) })).toBeDefined()
    }
  })

  it('shows cell and gene counts once a probe reports a shape', () => {
    renderTable({
      entries: [catalogToEntry(DATASET)],
      probes: new Map([['ds1', { status: 'ok' as const, version: 3, shape: { nObs: 927205, nVar: 31815 } }]]),
    })
    expect(screen.getByText('927K')).toBeDefined()
    expect(screen.getByText('32K')).toBeDefined()
  })

  it('shows a dash where the probe reported no shape', () => {
    renderTable({
      entries: [catalogToEntry(DATASET)],
      probes: new Map([['ds1', { status: 'ok' as const, version: 3 }]]),
    })
    // Collection, cells and genes are all unknown for this row.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('reorders rows when a column header is clicked, and reports the direction', () => {
    const small = { ...DATASET, slug: 'small', name: 'Small set' }
    const large = { ...DATASET, slug: 'large', name: 'Large set' }
    const unprobed = { ...DATASET, slug: 'unprobed', name: 'Unprobed set' }
    renderTable({
      entries: [catalogToEntry(small), catalogToEntry(large), catalogToEntry(unprobed)],
      probes: new Map([
        ['small', { status: 'ok' as const, shape: { nObs: 1000 } }],
        ['large', { status: 'ok' as const, shape: { nObs: 900000 } }],
        ['unprobed', { status: 'pending' as const }],
      ]),
    })

    const rowNames = () => screen.getAllByRole('row').slice(1)
      .map((r) => r.querySelector('.ce-row-name')?.textContent)
    const cellsHeader = () => screen.getByRole('columnheader', { name: /Cells/ })
    const sortCells = () => fireEvent.click(cellsHeader().querySelector('.ant-table-column-sorters')!)

    expect(rowNames()).toEqual(['Small set', 'Large set', 'Unprobed set'])

    // A size column opens on its largest values, not its smallest.
    sortCells()
    expect(cellsHeader().getAttribute('aria-sort')).toBe('descending')
    expect(rowNames()).toEqual(['Large set', 'Small set', 'Unprobed set'])

    sortCells()
    expect(cellsHeader().getAttribute('aria-sort')).toBe('ascending')
    // The unprobed dataset stays at the bottom rather than leading as "smallest".
    expect(rowNames()).toEqual(['Small set', 'Large set', 'Unprobed set'])
  })

  it('opens a name column ascending', () => {
    const b = { ...DATASET, slug: 'b', name: 'Beta' }
    const a = { ...DATASET, slug: 'a', name: 'Alpha' }
    renderTable({ entries: [catalogToEntry(b), catalogToEntry(a)] })
    const header = screen.getByRole('columnheader', { name: /Dataset/ })
    fireEvent.click(header.querySelector('.ant-table-column-sorters')!)
    expect(header.getAttribute('aria-sort')).toBe('ascending')
    expect(screen.getAllByRole('row').slice(1)
      .map((r) => r.querySelector('.ce-row-name')?.textContent)).toEqual(['Alpha', 'Beta'])
  })

  it('drops the collection column when told every row shares one', () => {
    const lung = { ...DATASET, collection: { slug: 'lung', name: 'Lung' } }
    renderTable({ entries: [catalogToEntry(lung)], showCollection: false })
    expect(screen.queryByRole('columnheader', { name: /Collection/ })).toBeNull()
    // The other columns are untouched.
    expect(screen.getByRole('columnheader', { name: /Cells/ })).toBeDefined()
  })

  it('offers remove only on local rows', () => {
    const onRemove = vi.fn()
    renderTable({
      entries: [catalogToEntry(DATASET), localToEntry('https://cdn/mine.zarr')],
      onRemove,
    })
    const buttons = screen.getAllByRole('button', { name: /^Remove / })
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ key: 'https://cdn/mine.zarr' }))
  })
})

describe('DatasetTable counts', () => {
  // Guards the split that is easy to reintroduce: the sorter and the cell must
  // read the same source, or a row sorts by one number and shows another.
  const HARVESTED = {
    ...DATASET,
    slug: 'harvested',
    name: 'Harvested',
    metadata: { n_obs: 927205, n_vars: 31815 },
  } as Parameters<typeof catalogToEntry>[0]

  it('renders catalog counts with no probe result at all', () => {
    renderTable({ entries: [catalogToEntry(HARVESTED)], probes: new Map() })
    expect(screen.getByText('927K')).toBeDefined()
    expect(screen.getByText('32K')).toBeDefined()
  })

  it('still renders probe counts for a pasted URL, which has no catalog row', () => {
    const url = 'https://example.org/pasted.zarr'
    renderTable({
      entries: [localToEntry(url)],
      probes: new Map([[url, { status: 'ok' as const, shape: { nObs: 4321, nVar: 99 } }]]),
    })
    expect(screen.getByText('4.3K')).toBeDefined()
  })

  it('shows a dash when neither source has counts', () => {
    renderTable({ entries: [catalogToEntry(DATASET)], probes: new Map() })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
