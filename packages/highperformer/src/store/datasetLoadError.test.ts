import { describe, it, expect } from 'vitest'
import { classifyHttpFailure } from './datasetLoadError'

const base = { slug: 'p', name: null, body: undefined, wasSignedIn: false }

describe('classifyHttpFailure', () => {
  it('401 when signed out → sign_in_required', () => {
    expect(classifyHttpFailure({ ...base, status: 401 })).toEqual({ kind: 'sign_in_required', slug: 'p', name: null })
  })

  it('401 when the user was signed in → session_expired', () => {
    expect(classifyHttpFailure({ ...base, status: 401, wasSignedIn: true })).toEqual({
      kind: 'session_expired', slug: 'p', name: null,
    })
  })

  it('403 → no_access', () => {
    expect(classifyHttpFailure({ ...base, status: 403 })).toEqual({ kind: 'no_access', slug: 'p', name: null })
  })

  it('404 → not_found', () => {
    expect(classifyHttpFailure({ ...base, status: 404 })).toEqual({ kind: 'not_found', slug: 'p' })
  })

  it('503 → unavailable', () => {
    expect(classifyHttpFailure({ ...base, status: 503, name: 'Private' })).toEqual({
      kind: 'unavailable', slug: 'p', name: 'Private',
    })
  })

  it('any other status → unavailable', () => {
    expect(classifyHttpFailure({ ...base, status: 500 }).kind).toBe('unavailable')
    expect(classifyHttpFailure({ ...base, status: undefined }).kind).toBe('unavailable')
  })

  it('body.name overrides the name argument', () => {
    const body = { detail: 'Authentication required', slug: 'p', name: 'Private Study' }
    expect(classifyHttpFailure({ ...base, status: 401, name: 'Old', body })).toEqual({
      kind: 'sign_in_required', slug: 'p', name: 'Private Study',
    })
  })

  it('a non-object body falls back to the name argument', () => {
    expect(classifyHttpFailure({ ...base, status: 403, name: 'Known', body: 'Forbidden' })).toEqual({
      kind: 'no_access', slug: 'p', name: 'Known',
    })
  })
})
