import { describe, expect, it } from 'vitest'
import { fitZoom, insetTarget, recallViewState, rememberViewState } from './viewport'

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
