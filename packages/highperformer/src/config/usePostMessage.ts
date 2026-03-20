import { useEffect, useRef } from 'react'
import { MessageSchema } from './schema'
import { applyConfig } from './applyConfig'
import { waitForStore } from './waitForStore'
import useAppStore from '../store/useAppStore'

/**
 * Convert a glob-style pattern (supporting * wildcards) to a RegExp.
 * Patterns match against the full origin string (protocol + host + port).
 */
export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/**
 * Check if an origin matches any of the allowed patterns.
 * If patterns is null, any origin is allowed (wildcard "*").
 */
export function isOriginAllowed(
  origin: string,
  patterns: RegExp[] | null,
): boolean {
  if (!patterns) return true
  return patterns.some((p) => p.test(origin))
}

/**
 * Listen for postMessage events from a parent iframe and apply config updates.
 *
 * Gated by two env vars:
 * - VITE_ENABLE_POSTMESSAGE must be "true"
 * - VITE_POSTMESSAGE_ORIGIN must be set (comma-separated origin patterns)
 *
 * First message (or new URL): full applyConfig.
 * Subsequent same-URL messages: filter-only update via selectByIds.
 */
export function usePostMessage(): void {
  const lastAppliedUrl = useRef<string | null>(null)

  useEffect(() => {
    const enabled = import.meta.env.VITE_ENABLE_POSTMESSAGE
    if (enabled !== 'true') return

    const originEnv = import.meta.env.VITE_POSTMESSAGE_ORIGIN as
      | string
      | undefined
    if (!originEnv) {
      console.warn(
        '[postMessage] VITE_ENABLE_POSTMESSAGE is true but VITE_POSTMESSAGE_ORIGIN is not set — listener not registered',
      )
      return
    }

    const debug = import.meta.env.VITE_POSTMESSAGE_DEBUG === 'true'

    const patterns =
      originEnv === '*'
        ? null
        : originEnv
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
            .map(patternToRegex)

    console.debug(
      '[postMessage] Listener registered, allowedOrigins:',
      originEnv,
    )

    // Signal to parent that the listener is ready
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'ready' }, '*')
      if (debug) console.log('[postMessage:debug] Sent ready signal to parent')
    }

    const listener = (event: MessageEvent) => {
      if (debug) {
        console.log('[postMessage:debug] Raw message received:', { origin: event.origin, data: event.data })
      }

      const result = MessageSchema.safeParse(event.data)
      if (!result.success) {
        if (debug && event.data && typeof event.data === 'object' && 'type' in event.data) {
          console.log('[postMessage:debug] Message validation failed:', result.error.issues)
        }
        return
      }

      if (patterns && !isOriginAllowed(event.origin, patterns)) {
        console.warn(
          '[postMessage] Rejected message from origin:',
          event.origin,
        )
        return
      }

      const { payload } = result.data

      if (debug) {
        console.log('[postMessage:debug] Valid message received:', {
          type: result.data.type,
          url: payload.url,
          lastAppliedUrl: lastAppliedUrl.current,
          isFirstMessage: payload.url !== lastAppliedUrl.current,
          hasFilter: !!payload.filter,
          filterIdCount: payload.filter?.ids.length ?? 0,
        })
      }

      // Different URL or first message: full applyConfig
      if (payload.url !== lastAppliedUrl.current) {
        if (debug) console.log('[postMessage:debug] Applying full config (new URL or first message)')
        lastAppliedUrl.current = payload.url
        applyConfig(payload)
        return
      }

      // Same URL: filter-only update
      const store = useAppStore

      if (payload.filter && payload.filter.ids.length > 0) {
        if (debug) console.log('[postMessage:debug] Filter-only update:', payload.filter.ids.length, 'IDs on column', payload.filter.obsColumn)
        // Wait for dataset readiness before applying filter
        waitForStore(store, (s) => s.obsColumnNames.length > 0)
          .then(() => {
            store
              .getState()
              .selectByIds(payload.filter!.obsColumn, payload.filter!.ids)
            store.setState({ summaryContext: 'selections' })
            if (debug) console.log('[postMessage:debug] Filter applied successfully')
          })
          .catch(() => {
            console.warn(
              '[postMessage] Timed out waiting for dataset — filter update dropped',
            )
          })
      } else {
        if (debug) console.log('[postMessage:debug] Clearing custom group (empty or missing filter)')
        // No filter or empty IDs: clear custom group
        store.getState().clearCustomGroup()
        store.setState({ summaryContext: 'all' })
      }
    }

    window.addEventListener('message', listener)
    return () => {
      console.debug('[postMessage] Listener removed')
      window.removeEventListener('message', listener)
    }
  }, [])
}
