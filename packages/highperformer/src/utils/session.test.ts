import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from '../store/useAppStore'
import { goTo } from './goTo'
import { signOut, switchAccount } from './session'

vi.mock('./goTo', () => ({ goTo: vi.fn() }))

describe('session', () => {
  let order: string[]

  beforeEach(() => {
    order = []
    useAppStore.setState({ logout: vi.fn(async () => { order.push('logout') }) })
    vi.mocked(goTo).mockImplementation((url: string) => { order.push(`goTo ${url}`) })
    window.history.replaceState(null, '', '/view?dataset=crc-atlas-v4')
  })

  afterEach(() => {
    vi.mocked(goTo).mockReset()
    window.history.replaceState(null, '', '/')
  })

  it('signOut logs out, then goes to the home page', async () => {
    await signOut()
    expect(order).toEqual(['logout', `goTo ${import.meta.env.BASE_URL}`])
  })

  it('switchAccount logs out, then signs in again returning to this page', async () => {
    await switchAccount()
    expect(order).toEqual([
      'logout',
      `goTo /api/auth/login?next=${encodeURIComponent('/view?dataset=crc-atlas-v4')}`,
    ])
  })
})
