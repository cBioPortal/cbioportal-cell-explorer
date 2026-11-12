import type { StoreApi } from 'zustand'

/**
 * How long to wait for data that competes with a dataset's first download: a
 * 4M-cell dataset's cell positions alone are ~15 MB, which slow mobile data
 * takes well over the default 30 seconds to fetch.
 */
export const DATASET_LOAD_TIMEOUT_MS = 120_000

export function waitForStore<T>(
  store: StoreApi<T>,
  predicate: (state: T) => boolean,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check immediately
    if (predicate(store.getState())) {
      resolve()
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = store.subscribe((state) => {
      if (predicate(state)) {
        if (timer) clearTimeout(timer)
        unsubscribe()
        resolve()
      }
    })

    timer = setTimeout(() => {
      unsubscribe()
      reject(new Error('waitForStore timed out'))
    }, timeoutMs)
  })
}
