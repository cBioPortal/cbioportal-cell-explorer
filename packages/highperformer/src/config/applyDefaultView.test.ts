import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { applyConfigMock } = vi.hoisted(() => ({ applyConfigMock: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('./applyConfig', () => ({ applyConfig: applyConfigMock }))

import useAppStore from '../store/useAppStore'
import { applyDefaultView, NARROW_LABEL_LIMIT } from './applyDefaultView'

const categories = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `c${i}`, color: [0, 0, 0] as [number, number, number] }))

const LABELLED = { colorBy: 'category', category: 'cell_type', showCategoryLabels: true }

describe('applyDefaultView', () => {
  const original = window.matchMedia
  const setNarrow = (narrow: boolean) => {
    window.matchMedia = vi.fn((q: string) => ({ matches: narrow && q.includes('max-width') }) as MediaQueryList)
  }

  beforeEach(() => {
    applyConfigMock.mockClear()
    useAppStore.setState({ showCategoryLabels: false, selectedObsColumn: null, categoryMap: [] })
  })
  afterEach(() => { window.matchMedia = original })

  it('applies the view unchanged on wide screens', async () => {
    setNarrow(false)
    await applyDefaultView(LABELLED)
    expect(applyConfigMock).toHaveBeenCalledWith(LABELLED)
  })

  it('applies a view without labels unchanged on phones', async () => {
    setNarrow(true)
    const view = { colorBy: 'category', category: 'cell_type' }
    await applyDefaultView(view)
    expect(applyConfigMock).toHaveBeenCalledWith(view)
  })

  it('holds back labels on phones when the category has many values', async () => {
    setNarrow(true)
    applyConfigMock.mockImplementationOnce(async () => {
      useAppStore.setState({ selectedObsColumn: 'cell_type', categoryMap: categories(44) })
      return { ok: true }
    })
    await applyDefaultView(LABELLED)
    expect(applyConfigMock).toHaveBeenCalledWith({ ...LABELLED, showCategoryLabels: false })
    expect(useAppStore.getState().showCategoryLabels).toBe(false)
  })

  it('keeps labels on phones when the category has few values', async () => {
    setNarrow(true)
    applyConfigMock.mockImplementationOnce(async () => {
      useAppStore.setState({ selectedObsColumn: 'cell_type', categoryMap: categories(NARROW_LABEL_LIMIT) })
      return { ok: true }
    })
    await applyDefaultView(LABELLED)
    expect(useAppStore.getState().showCategoryLabels).toBe(true)
  })

  it('counts a separate label column from its loaded summary data', async () => {
    setNarrow(true)
    const view = { ...LABELLED, categoryLabelsObsColumn: 'compartment' }
    applyConfigMock.mockImplementationOnce(async () => {
      useAppStore.setState({
        summaryObsData: new Map([['compartment', { codes: new Uint16Array(), categoryMap: categories(5) }]]),
      })
      return { ok: true }
    })
    await applyDefaultView(view)
    expect(useAppStore.getState().showCategoryLabels).toBe(true)
  })

  it('leaves labels alone when the view failed to apply', async () => {
    setNarrow(true)
    applyConfigMock.mockResolvedValueOnce({ ok: false, reason: { kind: 'internal', message: 'x' } })
    const result = await applyDefaultView(LABELLED)
    expect(result.ok).toBe(false)
    expect(useAppStore.getState().showCategoryLabels).toBe(false)
  })
})
