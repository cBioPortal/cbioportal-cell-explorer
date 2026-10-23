import { describe, it, expect } from 'vitest'
import { loginUrl } from './loginUrl'

describe('loginUrl', () => {
  it('passes the current page, query included, as next', () => {
    expect(loginUrl({ pathname: '/view', search: '?dataset=spectrum', hash: '' })).toBe(
      '/api/auth/login?next=%2Fview%3Fdataset%3Dspectrum',
    )
  })

  it('keeps the hash', () => {
    expect(loginUrl({ pathname: '/collections/crc-metastasis', search: '', hash: '#top' })).toBe(
      '/api/auth/login?next=%2Fcollections%2Fcrc-metastasis%23top',
    )
  })

  it('leaves next out on the index page', () => {
    expect(loginUrl({ pathname: '/', search: '', hash: '' })).toBe('/api/auth/login')
  })
})
