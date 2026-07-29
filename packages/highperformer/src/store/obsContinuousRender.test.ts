import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OBS_CONTINUOUS_SCALE_NAME } from '../utils/colors'

const dispatchMock = vi.fn().mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(0), version: 1 })
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = dispatchMock; clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('./useAppStore')

describe('rebuildColorBuffer — obs-continuous mode', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    dispatchMock.mockClear()
  })

  it('dispatches buildFromExpression with the obs-continuous scale', () => {
    useAppStore.setState({
      embeddingData: { positions: new Float32Array([0, 0, 1, 1]), numPoints: 2, bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } },
      opacity: 0.7,
      colorMode: 'obs-continuous',
      _obsContinuousData: new Float32Array([0.1, 0.9]),
      obsContinuousRange: { min: 0.1, max: 0.9 },
    } as never)

    useAppStore.getState().rebuildColorBuffer()

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'buildFromExpression',
      numPoints: 2,
      min: 0.1,
      max: 0.9,
      scaleName: OBS_CONTINUOUS_SCALE_NAME,
    }))
  })
})
