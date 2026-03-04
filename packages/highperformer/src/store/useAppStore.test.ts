import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock the WorkerPool before importing the store
const mockDispatch = vi.fn()
vi.mock('../pool/WorkerPool', () => {
  return {
    WorkerPool: class MockPool {
      dispatch = mockDispatch
      dispose() {}
    },
  }
})

// Mock the worker import (still needed for WorkerPool factory, but pool is mocked)
vi.mock('../workers/universal.worker.ts?worker', () => {
  return { default: class MockWorker {} }
})

const { default: useAppStore, getColorBuildVersion, resetColorBuildVersion } = await import('./useAppStore')

describe('useAppStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAppStore.setState(useAppStore.getInitialState())
    mockDispatch.mockClear()
    resetColorBuildVersion()
    // Default: dispatch resolves immediately with a fake colorBuffer response
    mockDispatch.mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(8), version: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useAppStore.getState()
      expect(state.pointRadius).toBe(1)
      expect(state.opacity).toBe(0.3)
      expect(state.antialiasing).toBe(true)
      expect(state.collisionEnabled).toBe(false)
      expect(state.collisionRadiusScale).toBe(0)
      expect(state.datasetUrl).toBeNull()
      expect(state.adata).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.embeddingData).toBeNull()
      expect(state.colorBuffer).toBeNull()
      expect(state.colorBufferLoading).toBe(false)
      expect(state.obsmKeys).toEqual([])
      expect(state.selectedEmbedding).toBeNull()
    })
  })

  describe('rendering control setters', () => {
    it('setPointRadius updates pointRadius', () => {
      useAppStore.getState().setPointRadius(3)
      expect(useAppStore.getState().pointRadius).toBe(3)
    })

    it('setAntialiasing updates antialiasing', () => {
      useAppStore.getState().setAntialiasing(false)
      expect(useAppStore.getState().antialiasing).toBe(false)
    })

    it('setCollisionEnabled updates collisionEnabled', () => {
      useAppStore.getState().setCollisionEnabled(true)
      expect(useAppStore.getState().collisionEnabled).toBe(true)
    })

    it('setCollisionRadiusScale updates collisionRadiusScale', () => {
      useAppStore.getState().setCollisionRadiusScale(5)
      expect(useAppStore.getState().collisionRadiusScale).toBe(5)
    })
  })

  describe('setOpacity', () => {
    it('updates opacity immediately', () => {
      useAppStore.getState().setOpacity(0.8)
      expect(useAppStore.getState().opacity).toBe(0.8)
    })

    it('sets colorBufferLoading to true immediately', () => {
      useAppStore.getState().setOpacity(0.5)
      expect(useAppStore.getState().colorBufferLoading).toBe(true)
    })

    it('debounces rebuildColorBuffer — does not fire immediately', () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1]),
          numPoints: 2,
          bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        },
      })
      mockDispatch.mockClear()

      useAppStore.getState().setOpacity(0.5)
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('fires rebuildColorBuffer after debounce delay', () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1]),
          numPoints: 2,
          bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        },
      })
      mockDispatch.mockClear()
      mockDispatch.mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(8), version: 1 })

      useAppStore.getState().setOpacity(0.5)
      vi.advanceTimersByTime(150)

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildDefault',
        numPoints: 2,
        rgb: [100, 150, 255],
        alpha: 0.5,
        version: expect.any(Number),
      })
    })

    it('coalesces rapid calls — only last opacity value fires', () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1]),
          numPoints: 2,
          bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        },
      })
      mockDispatch.mockClear()
      mockDispatch.mockResolvedValue({ type: 'colorBuffer', buffer: new Uint8Array(8), version: 1 })

      useAppStore.getState().setOpacity(0.3)
      useAppStore.getState().setOpacity(0.5)
      useAppStore.getState().setOpacity(0.8)
      vi.advanceTimersByTime(150)

      expect(mockDispatch).toHaveBeenCalledTimes(1)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildDefault',
        numPoints: 2,
        rgb: [100, 150, 255],
        alpha: 0.8,
        version: expect.any(Number),
      })
    })
  })

  describe('rebuildColorBuffer', () => {
    it('does nothing when embeddingData is null', () => {
      useAppStore.getState().rebuildColorBuffer()
      expect(mockDispatch).not.toHaveBeenCalled()
    })

    it('dispatches buildDefault message with version', () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1, 2, 2]),
          numPoints: 3,
          bounds: { minX: 0, maxX: 2, minY: 0, maxY: 2 },
        },
        opacity: 0.7,
      })

      useAppStore.getState().rebuildColorBuffer()

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildDefault',
        numPoints: 3,
        rgb: [100, 150, 255],
        alpha: 0.7,
        version: 1,
      })
    })

    it('matching version response updates store', async () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1]),
          numPoints: 2,
          bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        },
        colorBufferLoading: true,
      })

      const fakeBuffer = new Uint8Array(8)
      // dispatch resolves with version matching what rebuildColorBuffer sends (version 1)
      mockDispatch.mockResolvedValue({ type: 'colorBuffer', buffer: fakeBuffer, version: 1 })

      useAppStore.getState().rebuildColorBuffer()

      // Wait for the Promise to resolve
      await vi.waitFor(() => {
        expect(useAppStore.getState().colorBufferLoading).toBe(false)
      })
      expect(useAppStore.getState().colorBuffer).toBe(fakeBuffer)
    })

    it('discards stale responses with outdated version', async () => {
      useAppStore.setState({
        embeddingData: {
          positions: new Float32Array([0, 0, 1, 1]),
          numPoints: 2,
          bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        },
        colorBufferLoading: true,
      })

      // First rebuild (version 1) — resolves slowly with stale version
      let resolveFirst!: (v: unknown) => void
      mockDispatch.mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))

      useAppStore.getState().rebuildColorBuffer()

      // Second rebuild (version 2) — resolves immediately
      const currentBuffer = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])
      mockDispatch.mockResolvedValueOnce({ type: 'colorBuffer', buffer: currentBuffer, version: 2 })

      useAppStore.getState().rebuildColorBuffer()

      // Wait for the second dispatch's Promise to resolve and update store
      await vi.waitFor(() => {
        expect(useAppStore.getState().colorBuffer).toBe(currentBuffer)
      })

      // Now the first (stale) response arrives — should be discarded
      const staleBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      resolveFirst({ type: 'colorBuffer', buffer: staleBuffer, version: 1 })

      // Give microtasks time to settle
      await vi.waitFor(() => {
        // colorBuffer should still be the current one, not the stale one
        expect(useAppStore.getState().colorBuffer).toBe(currentBuffer)
      })
    })
  })
})
