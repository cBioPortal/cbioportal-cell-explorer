import { useCallback, useSyncExternalStore } from 'react'

/** Widest viewport, in CSS pixels, that gets the narrow (phone / upright tablet) layout. */
export const NARROW_MAX_WIDTH = 999

const QUERY = `(max-width: ${NARROW_MAX_WIDTH}px)`

/**
 * Whether the dataset page should use its narrow layout: plot full-screen with
 * chat in a bottom sheet. Decided by viewport width, not device type, so a
 * narrowed desktop window gets it too. Re-renders when the window crosses the
 * threshold (rotating a tablet, resizing a window).
 */
export function useNarrowLayout(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(QUERY)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}
