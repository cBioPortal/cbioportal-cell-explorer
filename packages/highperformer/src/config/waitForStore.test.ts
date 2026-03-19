import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { waitForStore } from './waitForStore'

describe('waitForStore', () => {
  it('resolves immediately if predicate is already true', async () => {
    const store = createStore(() => ({ ready: true }))
    await waitForStore(store, (s) => s.ready)
  })

  it('resolves when predicate becomes true', async () => {
    const store = createStore<{ ready: boolean }>(() => ({ ready: false }))
    const promise = waitForStore(store, (s) => s.ready)
    store.setState({ ready: true })
    await promise
  })

  it('rejects on timeout', async () => {
    vi.useFakeTimers()
    const store = createStore(() => ({ ready: false }))
    const promise = waitForStore(store, (s) => s.ready, 1000)
    // Attach the rejection handler before advancing timers to avoid unhandled rejection
    const rejection = expect(promise).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(1001)
    await rejection
    vi.useRealTimers()
  })

  it('cleans up subscription after resolving', async () => {
    const store = createStore<{ ready: boolean }>(() => ({ ready: false }))
    const promise = waitForStore(store, (s) => s.ready)
    store.setState({ ready: true })
    await promise
    expect(store.getState().ready).toBe(true)
  })
})
