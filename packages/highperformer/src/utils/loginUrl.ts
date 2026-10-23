/**
 * Sign-in link that brings the user back to the page they are on.
 *
 * The backend keeps `next` across the Keycloak round trip and redirects there
 * from its callback, so a user who signs in from a dataset view lands back on
 * that view instead of the index page.
 */
export function loginUrl(location: Pick<Location, 'pathname' | 'search' | 'hash'> = window.location): string {
  const next = `${location.pathname}${location.search}${location.hash}`
  if (next === '/' || next === '') return '/api/auth/login'
  return `/api/auth/login?next=${encodeURIComponent(next)}`
}
