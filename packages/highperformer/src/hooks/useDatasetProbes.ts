import { useState, useEffect } from 'react'
import { probeStore, type StoreShape } from '../utils/datasetProbe'
import type { DatasetEntry } from '../utils/datasetEntries'

export interface ProbeResult {
  status: 'pending' | 'ok' | 'error'
  version?: number
  shape?: StoreShape
}

export interface ResolvedAccess {
  url: string
  token?: string
}

/**
 * Probes every entry for reachability and reads its cell counts.
 *
 * This lives in a hook rather than inside the list because two callers need the
 * same results for different reasons: the list renders them per row, and the
 * landing page sums them into its overview figures. Probing twice would double
 * the requests.
 *
 * `entries` must be referentially stable — a fresh array each render re-probes.
 */
export default function useDatasetProbes(entries: DatasetEntry[]) {
  const [probes, setProbes] = useState<Map<string, ProbeResult>>(new Map())
  const [resolved, setResolved] = useState<Map<string, ResolvedAccess>>(new Map())

  useEffect(() => {
    const controller = new AbortController()

    const record = (key: string, result: ProbeResult) => {
      if (controller.signal.aborted) return
      setProbes((prev) => new Map(prev).set(key, result))
    }

    const toResult = (r: Awaited<ReturnType<typeof probeStore>>): ProbeResult =>
      r.ok ? { status: 'ok', version: r.version, shape: r.shape } : { status: 'error' }

    // Entries with a known URL — public catalog datasets and local URLs alike.
    for (const entry of entries) {
      if (!entry.url) continue
      const url = entry.url

      setProbes((prev) => (prev.has(entry.key) ? prev : new Map(prev).set(entry.key, { status: 'pending' })))
      setResolved((prev) => (prev.get(entry.key)?.url === url ? prev : new Map(prev).set(entry.key, { url })))

      // Catalogue rows already carry counts; only pasted URLs need the parse.
      probeStore(url, controller.signal, undefined, entry.counts == null)
        .then((r) => record(entry.key, toResult(r)))
        .catch(() => record(entry.key, { status: 'error' }))
    }

    // Private catalog datasets: resolve via /access, then probe with the token.
    const resolvePrivate = async () => {
      const needsAccess = entries.filter((e) => !e.url && e.kind === 'catalog' && e.slug)
      if (needsAccess.length === 0) return

      const { api } = await import('../api')
      for (const entry of needsAccess) {
        if (controller.signal.aborted) return
        setProbes((prev) => new Map(prev).set(entry.key, { status: 'pending' }))

        try {
          const { data } = await api.POST('/api/datasets/{slug}/access', {
            params: { path: { slug: entry.slug! } },
          })
          if (controller.signal.aborted || !data) continue

          const access: ResolvedAccess = { url: data.url as string }
          if (data.credential_type === 'bearer_token' && data.token) {
            access.token = data.token as string
          }
          setResolved((prev) => new Map(prev).set(entry.key, access))

          const headers = access.token ? { Authorization: `Bearer ${access.token}` } : undefined
          try {
            record(
              entry.key,
              toResult(await probeStore(access.url, controller.signal, headers, entry.counts == null)),
            )
          } catch {
            record(entry.key, { status: 'error' })
          }
        } catch {
          record(entry.key, { status: 'error' })
        }
      }
    }

    resolvePrivate()
    return () => controller.abort()
  }, [entries])

  return { probes, resolved }
}
