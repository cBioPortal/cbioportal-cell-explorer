import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitFor } from '@testing-library/react'

vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = vi.fn().mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(0), version: 1 }); clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('./useAppStore')

function fakeAdata(values: unknown) {
  return { obsColumn: vi.fn().mockResolvedValue(values) } as unknown as never
}

describe('selectObsColumn numeric detection', () => {
  beforeEach(() => { useAppStore.setState(useAppStore.getInitialState()) })
  afterEach(() => vi.clearAllMocks())

  it('numeric (TypedArray) column → obs-continuous with data and range, no warning', async () => {
    useAppStore.setState({ adata: fakeAdata(new Float32Array([0.2, 0.8, 0.5])) })
    useAppStore.getState().selectObsColumn('percent.rb')
    await waitFor(() => expect(useAppStore.getState().colorMode).toBe('obs-continuous'))
    const s = useAppStore.getState()
    expect(s._obsContinuousData).toBeInstanceOf(Float32Array)
    expect(s.obsContinuousRange!.min).toBeCloseTo(0.2, 5)
    expect(s.obsContinuousRange!.max).toBeCloseTo(0.8, 5)
    expect(s.categoryWarning).toBeNull()
    expect(s._categoryCodes).toBeNull()
  })

  it('string column → categorical (colorMode stays category, codes set)', async () => {
    useAppStore.setState({ adata: fakeAdata(['A', 'B', 'A']) })
    useAppStore.getState().selectObsColumn('cell_type')
    await waitFor(() => expect(useAppStore.getState()._categoryCodes).not.toBeNull())
    expect(useAppStore.getState().colorMode).toBe('category')
    expect(useAppStore.getState()._obsContinuousData).toBeNull()
  })
})
