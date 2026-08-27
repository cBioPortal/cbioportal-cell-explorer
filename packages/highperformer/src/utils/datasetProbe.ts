export interface StoreShape {
  /** Cells (AnnData `n_obs`). */
  nObs: number
  /** Genes / features (AnnData `n_var`). */
  nVar?: number
}

export interface ProbeStoreResult {
  ok: boolean
  version?: number
  shape?: StoreShape
}

function asPositiveInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

/** `[n_obs, n_var]` from an AnnData `X`, dense array or sparse group alike. */
function shapeFromX(node: unknown): number[] | undefined {
  if (!node || typeof node !== 'object') return undefined
  const n = node as Record<string, unknown>
  // Dense X is an array node carrying `shape` directly.
  if (Array.isArray(n.shape)) return n.shape as number[]
  // Sparse X (csr/csc) is a group whose `shape` lives in its attributes.
  const attrs = n.attributes as Record<string, unknown> | undefined
  if (attrs && Array.isArray(attrs.shape)) return attrs.shape as number[]
  return undefined
}

/**
 * Pull cell and gene counts out of a store's consolidated metadata.
 *
 * The probe already downloads this document to decide whether a dataset is
 * reachable; reading the counts out of it costs no extra request. Every step is
 * optional — an unfamiliar layout yields no counts rather than an error, and
 * the row simply shows nothing.
 */
export function parseStoreShape(doc: unknown, version: number): StoreShape | undefined {
  if (!doc || typeof doc !== 'object') return undefined
  const root = doc as Record<string, unknown>

  if (version === 3) {
    const consolidated = root.consolidated_metadata as Record<string, unknown> | undefined
    const md = consolidated?.metadata as Record<string, unknown> | undefined
    if (!md) return undefined

    const xShape = shapeFromX(md.X)
    if (xShape) {
      const nObs = asPositiveInt(xShape[0])
      if (nObs) return { nObs, nVar: asPositiveInt(xShape[1]) }
    }

    // No X — fall back to the length of the obs index column.
    const obs = md.obs as Record<string, unknown> | undefined
    const indexName = (obs?.attributes as Record<string, unknown> | undefined)?._index
    if (typeof indexName === 'string') {
      const indexNode = md[`obs/${indexName}`] ?? md[`obs/${indexName}/codes`]
      const shape = (indexNode as Record<string, unknown> | undefined)?.shape
      const nObs = Array.isArray(shape) ? asPositiveInt(shape[0]) : undefined
      if (nObs) return { nObs }
    }
    return undefined
  }

  // Zarr v2: `.zmetadata` maps each node's path to its `.zarray` / `.zattrs`.
  const md = root.metadata as Record<string, unknown> | undefined
  if (!md) return undefined

  const dense = (md['X/.zarray'] as Record<string, unknown> | undefined)?.shape
  if (Array.isArray(dense)) {
    const nObs = asPositiveInt(dense[0])
    if (nObs) return { nObs, nVar: asPositiveInt(dense[1]) }
  }

  const sparse = (md['X/.zattrs'] as Record<string, unknown> | undefined)?.shape
  if (Array.isArray(sparse)) {
    const nObs = asPositiveInt(sparse[0])
    if (nObs) return { nObs, nVar: asPositiveInt(sparse[1]) }
  }

  const indexName = (md['obs/.zattrs'] as Record<string, unknown> | undefined)?._index
  if (typeof indexName === 'string') {
    for (const path of [`obs/${indexName}/.zarray`, `obs/${indexName}/codes/.zarray`]) {
      const shape = (md[path] as Record<string, unknown> | undefined)?.shape
      const nObs = Array.isArray(shape) ? asPositiveInt(shape[0]) : undefined
      if (nObs) return { nObs }
    }
  }
  return undefined
}

/** Read the body only far enough to get counts; never let that fail the probe. */
async function shapeOf(res: Response, version: number): Promise<StoreShape | undefined> {
  try {
    return parseStoreShape(await res.json(), version)
  } catch {
    return undefined
  }
}

export async function probeStore(
  url: string,
  signal: AbortSignal,
  headers?: Record<string, string>,
  /**
   * Read the body to extract cell and gene counts.
   *
   * Off for catalogue rows, whose counts arrive with the catalogue: these
   * documents run to megabytes and are parsed on the main thread, once per
   * dataset, in parallel. Only pasted URLs — which have no catalogue row — need
   * the parse.
   */
  needShape = true,
): Promise<ProbeStoreResult> {
  const base = url.endsWith('/') ? url : url + '/'
  const opts: RequestInit = { method: 'GET', signal }
  if (headers) opts.headers = headers

  // Try zarr.json (v3), then .zmetadata (v2) — simple GET, no preflight
  const v3 = await fetch(base + 'zarr.json', opts)
  if (v3.ok) {
    const shape = needShape ? await shapeOf(v3, 3) : undefined
    return shape ? { ok: true, version: 3, shape } : { ok: true, version: 3 }
  }

  const v2 = await fetch(base + '.zmetadata', opts)
  if (v2.ok) {
    const shape = needShape ? await shapeOf(v2, 2) : undefined
    return shape ? { ok: true, version: 2, shape } : { ok: true, version: 2 }
  }

  return { ok: false }
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  } catch {
    return false
  }
}
