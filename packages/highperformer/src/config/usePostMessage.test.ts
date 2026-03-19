import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'

// Mock WorkerPool
const mockDispatch = vi.fn()
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class MockPool {
    dispatch = mockDispatch
    clearQueue = vi.fn()
    dispose() {}
  },
}))

vi.mock('../workers/universal.worker.ts?worker', () => ({
  default: class MockWorker {},
}))

// Mock applyConfig
const mockApplyConfig = vi.fn().mockResolvedValue(undefined)
vi.mock('./applyConfig', () => ({
  applyConfig: (...args: unknown[]) => mockApplyConfig(...args),
}))

const { default: useAppStore } = await import('../store/useAppStore')
const { patternToRegex, isOriginAllowed, usePostMessage } = await import(
  './usePostMessage'
)

describe('patternToRegex', () => {
  it('matches exact origin', () => {
    const re = patternToRegex('https://example.com')
    expect(re.test('https://example.com')).toBe(true)
    expect(re.test('https://other.com')).toBe(false)
  })

  it('matches wildcard subdomain', () => {
    const re = patternToRegex('https://*.cbioportal.org')
    expect(re.test('https://foo.cbioportal.org')).toBe(true)
    expect(re.test('https://bar.baz.cbioportal.org')).toBe(true)
    expect(re.test('https://cbioportal.org')).toBe(false)
    expect(re.test('http://foo.cbioportal.org')).toBe(false)
  })

  it('matches star wildcard for any origin', () => {
    const re = patternToRegex('*')
    expect(re.test('https://anything.com')).toBe(true)
    expect(re.test('http://localhost:3000')).toBe(true)
  })
})

describe('isOriginAllowed', () => {
  it('allows matching origin', () => {
    const patterns = [patternToRegex('https://example.com')]
    expect(isOriginAllowed('https://example.com', patterns)).toBe(true)
  })

  it('rejects non-matching origin', () => {
    const patterns = [patternToRegex('https://example.com')]
    expect(isOriginAllowed('https://other.com', patterns)).toBe(false)
  })

  it('checks multiple patterns', () => {
    const patterns = [
      patternToRegex('https://example.com'),
      patternToRegex('https://*.cbioportal.org'),
    ]
    expect(isOriginAllowed('https://foo.cbioportal.org', patterns)).toBe(true)
    expect(isOriginAllowed('https://example.com', patterns)).toBe(true)
    expect(isOriginAllowed('https://other.com', patterns)).toBe(false)
  })

  it('allows any origin with null patterns (wildcard *)', () => {
    expect(isOriginAllowed('https://anything.com', null)).toBe(true)
  })
})

describe('usePostMessage hook', () => {
  let addSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    mockApplyConfig.mockClear()
    mockDispatch.mockClear()
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    cleanup()
    addSpy.mockRestore()
    removeSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  function sendMessage(data: unknown, origin = 'https://example.com') {
    window.dispatchEvent(new MessageEvent('message', { data, origin }))
  }

  it('does not register listener when VITE_ENABLE_POSTMESSAGE is not set', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', '')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    renderHook(() => usePostMessage())
    const messageCalls = addSpy.mock.calls.filter(
      ([type]) => type === 'message',
    )
    expect(messageCalls).toHaveLength(0)
  })

  it('does not register listener when VITE_POSTMESSAGE_ORIGIN is not set', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '')
    renderHook(() => usePostMessage())
    const messageCalls = addSpy.mock.calls.filter(
      ([type]) => type === 'message',
    )
    expect(messageCalls).toHaveLength(0)
  })

  it('registers listener when both env vars are set', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    renderHook(() => usePostMessage())
    const messageCalls = addSpy.mock.calls.filter(
      ([type]) => type === 'message',
    )
    expect(messageCalls).toHaveLength(1)
  })

  it('removes listener on unmount', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    const { unmount } = renderHook(() => usePostMessage())
    unmount()
    const removeCalls = removeSpy.mock.calls.filter(
      ([type]) => type === 'message',
    )
    expect(removeCalls).toHaveLength(1)
  })

  it('calls applyConfig on first valid message', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    renderHook(() => usePostMessage())

    sendMessage({
      type: 'applyConfig',
      payload: { url: 'https://example.com/data.zarr' },
    })

    expect(mockApplyConfig).toHaveBeenCalledTimes(1)
    expect(mockApplyConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com/data.zarr' }),
    )
  })

  it('calls applyConfig again on different URL', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    renderHook(() => usePostMessage())

    sendMessage({
      type: 'applyConfig',
      payload: { url: 'https://example.com/a.zarr' },
    })
    sendMessage({
      type: 'applyConfig',
      payload: { url: 'https://example.com/b.zarr' },
    })

    expect(mockApplyConfig).toHaveBeenCalledTimes(2)
  })

  it('does not call applyConfig on same-URL message — calls selectByIds instead', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')

    // Pre-populate store so waitForStore resolves immediately
    useAppStore.setState({
      obsColumnNames: ['donor_id'],
      obsmKeys: [],
      varNames: [],
      varColumns: [],
    })

    const selectByIds = vi
      .spyOn(useAppStore.getState(), 'selectByIds')
      .mockImplementation(() => {})
    renderHook(() => usePostMessage())

    sendMessage({
      type: 'applyConfig',
      payload: { url: 'https://example.com/data.zarr' },
    })
    mockApplyConfig.mockClear()

    sendMessage({
      type: 'applyConfig',
      payload: {
        url: 'https://example.com/data.zarr',
        filter: { ids: ['ID1', 'ID2'], obsColumn: 'donor_id' },
      },
    })

    expect(mockApplyConfig).not.toHaveBeenCalled()
    // selectByIds is async via waitForStore, give microtask a tick
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(selectByIds).toHaveBeenCalledWith('donor_id', ['ID1', 'ID2'])
        selectByIds.mockRestore()
        resolve()
      }, 0)
    })
  })

  it('calls clearCustomGroup on same-URL message with empty filter', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')

    const clearCustomGroup = vi
      .spyOn(useAppStore.getState(), 'clearCustomGroup')
      .mockImplementation(() => {})
    renderHook(() => usePostMessage())

    sendMessage({
      type: 'applyConfig',
      payload: { url: 'https://example.com/data.zarr' },
    })
    sendMessage({
      type: 'applyConfig',
      payload: {
        url: 'https://example.com/data.zarr',
        filter: { ids: [], obsColumn: 'donor_id' },
      },
    })

    expect(clearCustomGroup).toHaveBeenCalled()
    clearCustomGroup.mockRestore()
  })

  it('silently ignores invalid messages', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', '*')
    renderHook(() => usePostMessage())

    sendMessage('not an object')
    sendMessage({ type: 'unknownType', payload: {} })
    sendMessage({ type: 'applyConfig', payload: { missing: 'url' } })

    expect(mockApplyConfig).not.toHaveBeenCalled()
  })

  it('rejects messages from disallowed origins', () => {
    vi.stubEnv('VITE_ENABLE_POSTMESSAGE', 'true')
    vi.stubEnv('VITE_POSTMESSAGE_ORIGIN', 'https://allowed.com')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderHook(() => usePostMessage())

    sendMessage(
      {
        type: 'applyConfig',
        payload: { url: 'https://example.com/data.zarr' },
      },
      'https://evil.com',
    )

    expect(mockApplyConfig).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Rejected'),
      'https://evil.com',
    )
    warn.mockRestore()
  })
})
