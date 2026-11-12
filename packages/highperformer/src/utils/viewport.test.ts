import { describe, expect, it, vi } from 'vitest'
import { PAN_CONTROLLER, commitViewState, fitZoom, insetTarget, plotPixelRatio, recallViewState, rememberViewState, resolveViewport, zoomLimits } from './viewport'

describe('fitZoom', () => {
  it('matches the existing fit', () => {
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 50 }
    expect(fitZoom(bounds, 800, 600)).toBeCloseTo(Math.log2(Math.min(800 / 110, 600 / 55)))
  })
})

describe('insetTarget', () => {
  it('leaves the target alone without an inset', () => {
    expect(insetTarget([10, 20], 1, 0)).toEqual([10, 20])
  })

  it('shifts the target down by half the inset in world units', () => {
    expect(insetTarget([10, 20], 1, 200)).toEqual([10, 70])
    expect(insetTarget([10, 20], 3, 200)).toEqual([10, 32.5])
  })
})

describe('rememberViewState / recallViewState', () => {
  it('returns the remembered camera for the same embedding only', () => {
    const a = {}
    const b = {}
    rememberViewState(a, { target: [1, 2, 0], zoom: 3 })
    expect(recallViewState(a)).toEqual({ target: [1, 2, 0], zoom: 3 })
    expect(recallViewState(b)).toBeNull()
  })
})

describe('resolveViewport', () => {
  const data = { minX: 0, maxX: 100, minY: 0, maxY: 100 }

  it('fit-to-view fits the data into the area above the inset', () => {
    const v = resolveViewport(null, data, 390, 700, 300)
    expect(v.zoom).toBeCloseTo(fitZoom(data, 390, 400))
    expect(v.target).toEqual(insetTarget([50, 50], v.zoom, 300))
  })

  it('an explicit target and zoom are kept, shifted above the inset', () => {
    const v = resolveViewport({ target: [10, 20], zoom: 2 }, data, 390, 700, 300)
    expect(v).toEqual({ target: insetTarget([10, 20], 2, 300), zoom: 2 })
  })

  it('fitBounds is fitted to the real canvas, not an assumed one', () => {
    const sel = { minX: 10, maxX: 30, minY: 40, maxY: 50 }
    const v = resolveViewport({ target: [20, 45], zoom: 99, fitBounds: sel }, data, 390, 700, 300)
    expect(v.zoom).toBeCloseTo(fitZoom(sel, 390, 400))
    expect(v.target).toEqual(insetTarget([20, 45], v.zoom, 300))
  })
})

describe('commitViewState', () => {
  it('applies the camera to deck and remembers it for the embedding', () => {
    const setProps = vi.fn()
    const key = {}
    commitViewState({ setProps }, key, { target: [1, 2], zoom: 3 })
    expect(setProps).toHaveBeenCalledWith({ viewState: { target: [1, 2, 0], zoom: 3 } })
    expect(recallViewState(key)).toEqual({ target: [1, 2, 0], zoom: 3 })
  })
})

describe('zoomLimits', () => {
  it('allows zooming in 256x and out 2x from the fit', () => {
    expect(zoomLimits(3)).toEqual({ minZoom: 2, maxZoom: 11 })
  })
})

describe('PAN_CONTROLLER', () => {
  it('lets a flick glide after release', () => {
    expect(PAN_CONTROLLER.inertia).toBe(300)
  })
})

describe('plotPixelRatio', () => {
  const original = window.matchMedia
  const stub = (coarse: boolean) => {
    window.matchMedia = vi.fn((q: string) => ({ matches: q === '(pointer: coarse)' && coarse }) as MediaQueryList)
  }

  it('draws at 1x on touch-first devices', () => {
    stub(true)
    expect(plotPixelRatio()).toBe(1)
    window.matchMedia = original
  })

  it('keeps the screen density with a mouse or trackpad', () => {
    stub(false)
    expect(plotPixelRatio()).toBe(true)
    window.matchMedia = original
  })
})
