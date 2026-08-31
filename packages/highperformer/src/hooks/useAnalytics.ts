import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js'

/**
 * Loads Google Analytics when the backend supplies a measurement id.
 *
 * The id arrives at runtime from `/api/info` rather than a build-time `VITE_`
 * variable, because one image is deployed to several environments and a baked
 * id could not differ between them. No id means no script: that is how a
 * deployment opts out, and why the GitHub Pages build — which has no backend to
 * ask — is untracked.
 *
 * Embedded iframe views are deliberately *not* special-cased. The iframe loads
 * this same app from the same origin, so it reports to the same property as a
 * standalone visit. That is not double-counting: the embedding page reports to
 * its own property, which counts a different thing.
 */
export function useAnalytics(): void {
  const measurementId = useAppStore(
    (s) => s.backendInfo?.google_analytics_id ?? null,
  )
  const location = useLocation()
  const loadedId = useRef<string | null>(null)

  useEffect(() => {
    if (!measurementId) return
    // The hook re-runs on every navigation. Loading gtag.js more than once
    // would register duplicate handlers and count each page view twice.
    if (loadedId.current === measurementId) return
    loadedId.current = measurementId

    window.dataLayer = window.dataLayer || []
    // gtag pushes `arguments` verbatim, so it cannot be an arrow function.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
    window.gtag('js', new Date())
    // Page views are sent explicitly below, per route change. Without this the
    // tag would also fire its own on load, duplicating the first one.
    window.gtag('config', measurementId, { send_page_view: false })

    const script = document.createElement('script')
    script.async = true
    script.src = `${GTAG_SRC}?id=${encodeURIComponent(measurementId)}`
    document.head.appendChild(script)
  }, [measurementId])

  useEffect(() => {
    if (!measurementId || !window.gtag) return
    // Full path, query included: which dataset was opened is the point of
    // tracking here, and that was a deliberate call rather than a default.
    const pagePath = `${location.pathname}${location.search}`
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [measurementId, location.pathname, location.search])
}
