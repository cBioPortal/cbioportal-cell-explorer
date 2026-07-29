import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitFor } from '@testing-library/react'

// Mock the worker pool so rebuildColorBuffer's dispatch resolves harmlessly.
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = vi.fn().mockResolvedValue({}); clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('./useAppStore')

function fakeAdataReturning(values: (string | number | null)[]) {
  return { obsColumn: vi.fn().mockResolvedValue(values) } as unknown as never
}

describe('selectObsColumn cardinality tiers', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })
  afterEach(() => vi.clearAllMocks())

  it('low cardinality: colors with no warning', async () => {
    useAppStore.setState({ adata: fakeAdataReturning(['A', 'B', 'A', 'C']) })
    useAppStore.getState().selectObsColumn('col')
    await waitFor(() => expect(useAppStore.getState()._categoryCodes).not.toBeNull())
    expect(useAppStore.getState().categoryWarning).toBeNull()
  })

  it('mid cardinality: colors AND sets a repeat note', async () => {
    const values = Array.from({ length: 30 }, (_, i) => `c${i}`)
    useAppStore.setState({ adata: fakeAdataReturning(values) })
    useAppStore.getState().selectObsColumn('col')
    await waitFor(() => expect(useAppStore.getState()._categoryCodes).not.toBeNull())
    expect(useAppStore.getState().categoryWarning).toContain('colors repeat')
  })

  it('above the legend cap: colors but does NOT auto-pin to summary', async () => {
    const values = Array.from({ length: 501 }, (_, i) => `c${i}`)
    useAppStore.setState({ adata: fakeAdataReturning(values) })
    useAppStore.getState().selectObsColumn('col')
    await waitFor(() => expect(useAppStore.getState()._categoryCodes).not.toBeNull())
    expect(useAppStore.getState().summaryObsColumns).not.toContain('col')
  })

  it('above the colorable ceiling: blocks (no codes) and warns', async () => {
    const values = Array.from({ length: 65536 }, (_, i) => `c${i}`)
    useAppStore.setState({ adata: fakeAdataReturning(values) })
    useAppStore.getState().selectObsColumn('col')
    await waitFor(() => expect(useAppStore.getState().categoryWarning).not.toBeNull())
    expect(useAppStore.getState()._categoryCodes).toBeNull()
    expect(useAppStore.getState().categoryWarning).toContain('too many to color')
  })
})
