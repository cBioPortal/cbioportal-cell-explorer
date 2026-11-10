import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = vi.fn().mockResolvedValue({}); clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('../store/useAppStore')
const { default: AttributionCredit } = await import('./AttributionCredit')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const CRC = {
  slug: 'crc-atlas',
  name: 'The single-cell Colorectal Cancer Atlas',
  publication_citation: 'Marteau et al., Cancer Cell (2026)',
  publication_url: 'https://doi.org/10.1016/j.ccell.2025.12.003',
  license_name: 'CC BY 4.0',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
  source_url: 'https://doi.org/10.5281/zenodo.17878122',
  attribution_note: 'Converted from h5ad to zarr; no other changes.',
}

function openWith(collection: Record<string, unknown> | null, open: { slug?: string | null; url?: string | null } = { slug: 'ds' }) {
  useAppStore.setState(useAppStore.getInitialState())
  useAppStore.setState({
    catalogDatasets: [{ slug: 'ds', name: 'DS', description: null, is_public: true, url: 'https://cdn/ds.zarr', chat_enabled: false, collection }],
    datasetSlug: open.slug ?? null,
    datasetUrl: open.url ?? 'https://cdn/ds.zarr',
  } as any)
  // The popover's "View collection" link is a router Link
  render(<MemoryRouter><AttributionCredit /></MemoryRouter>)
}

describe('AttributionCredit', () => {
  it('shows citation and license, each linked', () => {
    openWith(CRC)
    const cite = screen.getByRole('link', { name: 'Marteau et al., Cancer Cell (2026)' })
    expect(cite.getAttribute('href')).toBe(CRC.publication_url)
    expect(cite.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: 'CC BY 4.0' }).getAttribute('href')).toBe(CRC.license_url)
    expect(screen.getByText('details')).toBeDefined()
  })

  it('sits above a bottom overlay such as the phone chat sheet', () => {
    openWith(CRC)
    let el: HTMLElement | null = screen.getByRole('link', { name: 'CC BY 4.0' })
    while (el && el.style.position !== 'absolute') el = el.parentElement
    expect(el!.style.bottom).toBe('8px')
    cleanup()
    openWith(CRC)
    act(() => useAppStore.setState({ plotBottomInset: 168 }))
    el = screen.getByRole('link', { name: 'CC BY 4.0' })
    while (el && el.style.position !== 'absolute') el = el.parentElement
    expect(el!.style.bottom).toBe('176px')
  })

  it('shows only the citation when there is no license', () => {
    openWith({ ...CRC, license_name: null, license_url: null })
    expect(screen.getByRole('link', { name: 'Marteau et al., Cancer Cell (2026)' })).toBeDefined()
    expect(screen.queryByText('CC BY 4.0')).toBeNull()
  })

  it('falls back to the collection name, unlinked, when there is no citation', () => {
    openWith({ ...CRC, publication_citation: null, publication_url: null })
    expect(screen.getByText(CRC.name).closest('a')).toBeNull()
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeDefined()
  })

  it('renders nothing without citation or license', () => {
    openWith({ slug: 'p', name: 'Plain' })
    expect(screen.queryByText(/Data:/)).toBeNull()
  })

  it('resolves a direct url open', () => {
    openWith(CRC, { slug: null, url: 'https://cdn/ds.zarr/' })
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeDefined()
  })

  it('opens details with cite, license and source, but not the note', async () => {
    openWith(CRC)
    fireEvent.click(screen.getByText('details'))
    expect(await screen.findByText(CRC.name)).toBeDefined()
    expect(screen.getByText('doi.org/10.5281/zenodo.17878122')).toBeDefined()
    // The note lives on the collection page only
    expect(screen.queryByText('Note')).toBeNull()
    expect(screen.queryByText(CRC.attribution_note)).toBeNull()
    expect(screen.getByRole('link', { name: /View collection/ }).getAttribute('href')).toBe('/collections/crc-atlas')
  })

  it('details trigger is a keyboard-operable button', () => {
    openWith(CRC)
    const detailsButton = screen.getByRole('button', { name: 'details' })
    expect(detailsButton.tagName).toBe('BUTTON')
  })

  it('opens details from the button trigger', async () => {
    openWith(CRC)
    const detailsButton = screen.getByRole('button', { name: 'details' })
    fireEvent.click(detailsButton)
    expect(await screen.findByText(CRC.name)).toBeDefined()
  })

  it('flips aria-expanded on the trigger when details open', async () => {
    openWith(CRC)
    const btn = screen.getByRole('button', { name: 'details' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(btn)
    await screen.findByText(CRC.name)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders the popover inside the credit line so Tab can reach its links', async () => {
    openWith(CRC)
    fireEvent.click(screen.getByRole('button', { name: 'details' }))
    const link = await screen.findByRole('link', { name: /View collection/ })
    expect(link.closest('[data-testid="attribution-credit"]')).not.toBeNull()
  })

  it('lets pointer events through while a selection tool is active', () => {
    openWith(CRC)
    const box = screen.getByTestId('attribution-credit')
    expect(box.style.pointerEvents).not.toBe('none')
    act(() => useAppStore.setState({ selectionTool: 'lasso' } as any))
    expect(screen.getByTestId('attribution-credit').style.pointerEvents).toBe('none')
    act(() => useAppStore.setState({ selectionTool: 'pan' } as any))
    expect(screen.getByTestId('attribution-credit').style.pointerEvents).not.toBe('none')
  })

  it('uses one link style for anchors and the details button', () => {
    openWith(CRC)
    const a = screen.getByRole('link', { name: 'CC BY 4.0' })
    const b = screen.getByRole('button', { name: 'details' })
    expect(a.style.color).toBe(b.style.color)
    expect(a.style.textDecoration).toBe('none')
    expect(b.style.textDecoration).toBe('none')
  })

  it('opens the collection in a new tab when embedded', async () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as any)
    openWith(CRC)
    fireEvent.click(screen.getByRole('button', { name: 'details' }))
    const link = await screen.findByRole('link', { name: /View collection/ })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('href')).toBe('/collections/crc-atlas')
  })

  it('appears once a late catalog arrives', () => {
    openWith(CRC)
    act(() => useAppStore.setState({ catalogDatasets: [] } as any))
    expect(screen.queryByText(/Data:/)).toBeNull()
    act(() =>
      useAppStore.setState({
        catalogDatasets: [{ slug: 'ds', name: 'DS', description: null, is_public: true, url: 'https://cdn/ds.zarr', chat_enabled: false, collection: CRC }],
      } as any),
    )
    expect(screen.getByText(/Data:/)).toBeDefined()
  })
})
