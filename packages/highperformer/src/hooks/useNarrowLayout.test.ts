import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNarrowLayout } from './useNarrowLayout'

function fakeMediaQuery(initial: boolean) {
  const listeners = new Set<() => void>()
  const mql = {
    matches: initial,
    media: '',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  const change = (matches: boolean) => {
    mql.matches = matches
    listeners.forEach((fn) => fn())
  }
  return { mql, change }
}

describe('useNarrowLayout', () => {
  const original = window.matchMedia
  let media: ReturnType<typeof fakeMediaQuery>
  let queries: string[]

  function stub(initial: boolean) {
    media = fakeMediaQuery(initial)
    queries = []
    window.matchMedia = vi.fn((q: string) => {
      queries.push(q)
      return media.mql as unknown as MediaQueryList
    })
  }

  beforeEach(() => stub(false))
  afterEach(() => { window.matchMedia = original })

  it('returns true when the narrow query matches', () => {
    stub(true)
    const { result } = renderHook(() => useNarrowLayout())
    expect(result.current).toBe(true)
    expect(queries).toContain('(max-width: 999px)')
  })

  it('returns false on wide screens', () => {
    const { result } = renderHook(() => useNarrowLayout())
    expect(result.current).toBe(false)
  })

  it('updates when the query starts or stops matching', () => {
    const { result } = renderHook(() => useNarrowLayout())
    act(() => media.change(true))
    expect(result.current).toBe(true)
    act(() => media.change(false))
    expect(result.current).toBe(false)
  })
})
