import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn().mockResolvedValue({ data: undefined }) } }))
vi.mock('../utils/datasetProbe', () => ({ probeStore: vi.fn().mockResolvedValue({ ok: true, version: 3 }) }))
vi.mock('../hooks/useNarrowLayout', () => ({ usePhoneLayout: () => true }))

import DatasetTable from './DatasetTable'
import { catalogToEntry, localToEntry, type DatasetEntry } from '../utils/datasetEntries'

afterEach(() => cleanup())

const ds = (slug: string, name: string, nObs: number, nVar: number, collection: string | null) =>
  catalogToEntry({
    slug,
    name,
    description: null,
    is_public: true,
    url: `https://cdn/${slug}.zarr`,
    chat_enabled: false,
    collection: collection ? { slug: collection.toLowerCase(), name: collection } : null,
    metadata: { n_obs: nObs, n_vars: nVar },
  } as never)

const BIG = ds('big', 'Zeta atlas', 927_205, 32_000, 'Ovary')
const SMALL = ds('small', 'Alpha atlas', 25_000, 19_000, 'Brain')
const MID = ds('mid', 'Mid atlas', 102_000, 36_000, null)

function Where() {
  return <div data-testid="where">{useLocation().pathname + useLocation().search}</div>
}

const renderCards = (entries: DatasetEntry[], extra: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <DatasetTable entries={entries} probes={new Map()} resolved={new Map()} {...extra} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('DatasetTable on phones', () => {
  it('renders a card per dataset instead of a table', () => {
    const { container } = renderCards([BIG, SMALL])
    expect(container.querySelector('table')).toBeNull()
    expect(names()).toEqual(['Zeta atlas', 'Alpha atlas'])
  })

  it('puts collection, cells, genes and status under the name', () => {
    renderCards([BIG])
    const card = screen.getByRole('link', { name: /Zeta atlas/ }).closest('.ce-card') as HTMLElement
    expect(within(card).getByRole('link', { name: 'Ovary' })).toBeDefined()
    expect(within(card).getByText('927K cells')).toBeDefined()
    expect(within(card).getByText('32K genes')).toBeDefined()
    expect(within(card).getByText(/Public/)).toBeDefined()
  })

  it('leaves out the collection when every row shares it', () => {
    renderCards([BIG], { showCollection: false })
    expect(screen.queryByRole('link', { name: 'Ovary' })).toBeNull()
  })

  it('does not show the zarr URL', () => {
    renderCards([BIG])
    expect(screen.queryByText('https://cdn/big.zarr')).toBeNull()
  })

  it('opens the dataset from the card', () => {
    renderCards([BIG])
    fireEvent.click(screen.getByRole('link', { name: /Zeta atlas/ }))
    expect(screen.getByTestId('where').textContent).toBe('/view?dataset=big')
  })

  it('states the count beside the sort control', () => {
    renderCards([BIG, SMALL, MID])
    expect(screen.getByText('3 datasets')).toBeDefined()
  })

  it('sorts by name, most cells and most genes', () => {
    renderCards([BIG, SMALL, MID])
    const sort = screen.getByRole('combobox', { name: 'Sort' })

    fireEvent.change(sort, { target: { value: 'name' } })
    expect(names()).toEqual(['Alpha atlas', 'Mid atlas', 'Zeta atlas'])

    fireEvent.change(sort, { target: { value: 'cells' } })
    expect(names()).toEqual(['Zeta atlas', 'Mid atlas', 'Alpha atlas'])

    fireEvent.change(sort, { target: { value: 'genes' } })
    expect(names()).toEqual(['Mid atlas', 'Zeta atlas', 'Alpha atlas'])

    fireEvent.change(sort, { target: { value: 'default' } })
    expect(names()).toEqual(['Zeta atlas', 'Alpha atlas', 'Mid atlas'])
  })

  it('sorts by collection with uncollected datasets last', () => {
    renderCards([BIG, SMALL, MID])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'collection' } })
    expect(names()).toEqual(['Alpha atlas', 'Zeta atlas', 'Mid atlas'])
  })

  it('offers no collection sort where the column is hidden', () => {
    renderCards([BIG], { showCollection: false })
    const sort = screen.getByRole('combobox', { name: 'Sort' })
    expect(within(sort).queryByRole('option', { name: 'Collection' })).toBeNull()
  })

  it('pages long lists 25 at a time', () => {
    const many = Array.from({ length: 30 }, (_, i) => ds(`d${i}`, `Dataset ${i}`, 1000 + i, 10, null))
    renderCards(many)
    expect(names()).toHaveLength(25)
    fireEvent.click(screen.getByTitle('Next Page'))
    expect(names()).toHaveLength(5)
  })

  it('keeps the remove button for pasted URLs', () => {
    const onRemove = vi.fn()
    const local = localToEntry('https://example.org/mine.zarr')
    renderCards([local], { onRemove })
    fireEvent.click(screen.getByRole('button', { name: `Remove ${local.name}` }))
    expect(onRemove).toHaveBeenCalledWith(local)
    expect(screen.getByTestId('where').textContent).toBe('/')
  })

  it('shows the empty text when there is nothing to list', () => {
    renderCards([], { emptyText: 'Nothing here.' })
    expect(screen.getByText('Nothing here.')).toBeDefined()
  })
})
