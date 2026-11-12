import { useCallback, useSyncExternalStore } from 'react'

/** Widest viewport, in CSS pixels, that gets the narrow (phone / upright tablet) layout. */
export const NARROW_MAX_WIDTH = 999

/**
 * Widest viewport that gets the phone layout of the dataset lists (home and
 * collection pages). Matches the `max-width: 720px` block in index.css.
 */
export const PHONE_MAX_WIDTH = 720

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/**
 * Whether the dataset page should use its narrow layout: plot full-screen with
 * chat in a bottom sheet. Decided by viewport width, not device type, so a
 * narrowed desktop window gets it too. Re-renders when the window crosses the
 * threshold (rotating a tablet, resizing a window).
 */
export function useNarrowLayout(): boolean {
  return useMediaQuery(`(max-width: ${NARROW_MAX_WIDTH}px)`)
}

/** Whether the dataset lists should show cards and a filter sheet instead of a table and sidebar. */
export function usePhoneLayout(): boolean {
  return useMediaQuery(`(max-width: ${PHONE_MAX_WIDTH}px)`)
}
