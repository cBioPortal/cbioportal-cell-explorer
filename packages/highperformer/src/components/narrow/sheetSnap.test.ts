import { describe, expect, it } from 'vitest'
import { nearestSnap, snapAfterPlotChange, snapHeights } from './sheetSnap'

describe('sheetSnap', () => {
  const heights = snapHeights(844)

  it('snapHeights: peek 168, half 50%, full = screen minus the 48px top bar', () => {
    expect(heights).toEqual({ peek: 168, half: 422, full: 796 })
  })

  it('nearestSnap picks the closest height', () => {
    expect(nearestSnap(300, heights)).toBe('half')
    expect(nearestSnap(150, heights)).toBe('peek')
    expect(nearestSnap(780, heights)).toBe('full')
  })

  it('a plot change brings full down to half and leaves the rest', () => {
    expect(snapAfterPlotChange('full')).toBe('half')
    expect(snapAfterPlotChange('half')).toBe('half')
    expect(snapAfterPlotChange('peek')).toBe('peek')
  })
})
