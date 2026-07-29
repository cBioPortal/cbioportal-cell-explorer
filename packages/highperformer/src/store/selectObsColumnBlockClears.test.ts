import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitFor } from '@testing-library/react'

const dispatchMock = vi.fn().mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(0), version: 1 })
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = dispatchMock; clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('./useAppStore')

function fakeAdata(values: unknown) {
  return { obsColumn: vi.fn().mockResolvedValue(values) } as unknown as never
}

describe('selectObsColumn — blocked high-cardinality column clears the plot', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    dispatchMock.mockClear()
  })
  afterEach(() => vi.clearAllMocks())

  it('clears colors (dispatches buildDefault) and warns when a column is too high-cardinality', async () => {
    useAppStore.setState({
      adata: fakeAdata(Array.from({ length: 65536 }, (_, i) => `c${i}`)),
      embeddingData: { positions: new Float32Array([0, 0, 1, 1]), numPoints: 2, bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } },
    })
    useAppStore.getState().selectObsColumn('observation_joinid')
    await waitFor(() => expect(useAppStore.getState().categoryWarning).not.toBeNull())
    expect(useAppStore.getState().categoryWarning).toContain('too many to color')
    expect(useAppStore.getState()._categoryCodes).toBeNull()
    // The plot must be reset to the default (uncolored) render, not left on the prior coloring.
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'buildDefault' }))
  })
})
