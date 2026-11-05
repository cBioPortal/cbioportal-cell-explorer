import { act, cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notification } from 'antd'

vi.mock('@deck.gl/react', async () => {
  const React = await import('react')
  return { DeckGL: React.forwardRef(function DeckGL() { return null }) }
})
vi.mock('../api', () => ({
  api: { GET: vi.fn().mockResolvedValue({ data: undefined }), POST: vi.fn().mockResolvedValue({ data: undefined }) },
}))
const mockApplyConfig = vi.fn()
vi.mock('../config/applyConfig', () => ({
  applyConfig: (...args: unknown[]) => mockApplyConfig(...args),
}))

import useAppStore from '../store/useAppStore'
import View from './View'

function renderView(config: string) {
  return render(
    <MemoryRouter initialEntries={[`/view?config=${encodeURIComponent(config)}`]}>
      <View />
    </MemoryRouter>,
  )
}

describe('View ?config= handling', () => {
  beforeEach(() => {
    mockApplyConfig.mockReset()
    useAppStore.setState({ backendInfo: null, backendProbed: true, loadingError: null })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useAppStore.setState({ loadingError: null })
  })

  it('an unreadable config shows the "saved view is invalid" page', async () => {
    const { findByText } = renderView('{not json')
    expect(await findByText("This link's saved view is invalid")).toBeTruthy()
    expect(mockApplyConfig).not.toHaveBeenCalled()
  })

  it('an apply-time failure with the dataset loaded shows a warning notice, not the status page', async () => {
    const warning = vi.spyOn(notification, 'warning').mockImplementation(() => {})
    mockApplyConfig.mockResolvedValue({ ok: false, reason: { kind: 'missing_companion', field: 'gene' } })
    const { queryByRole } = renderView(JSON.stringify({ url: 'https://cdn/x.zarr', colorBy: 'gene', gene: 'CD3E' }))
    await vi.waitFor(() => expect(warning).toHaveBeenCalledTimes(1))
    expect(warning).toHaveBeenCalledWith({
      message: "Some of this link's view settings couldn't be applied",
      description: "Couldn't apply: colorBy is set but gene is missing",
    })
    expect(queryByRole('status')).toBeNull()
  })

  it('an apply failure after the dataset itself failed shows the status page, no notice', async () => {
    const warning = vi.spyOn(notification, 'warning').mockImplementation(() => {})
    mockApplyConfig.mockImplementation(async () => {
      useAppStore.setState({ loadingError: { kind: 'not_found', slug: 'nope' } })
      return { ok: false, reason: { kind: 'metadata_unavailable', field: 'post-load' } }
    })
    const { findByText } = renderView(JSON.stringify({ dataset: 'nope', embedding: 'X_umap' }))
    expect(await findByText('Dataset not found')).toBeTruthy()
    await act(async () => {})
    expect(warning).not.toHaveBeenCalled()
  })

  it('a config naming a dataset waits for the auth check before applying', async () => {
    mockApplyConfig.mockResolvedValue({ ok: true })
    useAppStore.setState({ backendInfo: { auth_enabled: true } as never, authChecked: false })
    renderView(JSON.stringify({ dataset: 'private-study' }))
    await act(async () => {})
    expect(mockApplyConfig).not.toHaveBeenCalled()
    act(() => useAppStore.setState({ authChecked: true }))
    await vi.waitFor(() => expect(mockApplyConfig).toHaveBeenCalledTimes(1))
  })
})
