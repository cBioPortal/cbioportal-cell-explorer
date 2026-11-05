/**
 * Why a dataset could not be opened. Each kind maps to one status page in
 * DatasetStatus — access and not-found states are not failures, so they are
 * kept apart from the kinds where something is actually broken.
 */
export type DatasetLoadError =
  | { kind: 'sign_in_required'; slug: string; name: string | null }
  | { kind: 'session_expired'; slug: string; name: string | null }
  | { kind: 'no_access'; slug: string; name: string | null }
  | { kind: 'not_found'; slug: string }
  | { kind: 'unreachable' }
  | { kind: 'unavailable'; slug: string; name: string | null }
  | { kind: 'files_failed'; slug: string; name: string | null; detail: string }
  | { kind: 'store_failed'; url: string; detail: string }
  | { kind: 'config_unreadable' }

/**
 * Classify a non-ok response from the dataset GET or /access endpoint.
 *
 * `wasSignedIn` must be read before the request: the api client's 401
 * middleware clears `user` before the caller sees the response.
 */
export function classifyHttpFailure(args: {
  status: number | undefined
  body: unknown
  slug: string
  name: string | null
  wasSignedIn: boolean
}): DatasetLoadError {
  const { status, body, slug, wasSignedIn } = args
  // The API names the dataset in its 401/403 body; prefer that over anything
  // the caller already knew.
  const bodyName =
    typeof body === 'object' && body !== null && typeof (body as { name?: unknown }).name === 'string'
      ? (body as { name: string }).name
      : null
  const name = bodyName ?? args.name

  switch (status) {
    case 401:
      return { kind: wasSignedIn ? 'session_expired' : 'sign_in_required', slug, name }
    case 403:
      return { kind: 'no_access', slug, name }
    case 404:
      return { kind: 'not_found', slug }
    default:
      return { kind: 'unavailable', slug, name }
  }
}
