import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationView } from './ConversationView'
import * as useChatTurnModule from './useChatTurn'
import { HttpError, type ChatEvent, type ContextResponse } from './types'
import { loginUrl } from '../utils/loginUrl'
import useAppStore from '../store/useAppStore'

const mockApplyConfig = vi.fn()
vi.mock('../config/applyConfig', () => ({
  applyConfig: (...args: unknown[]) => mockApplyConfig(...args),
}))

const ctx: ContextResponse = {
  slug: 'spectrum',
  name: 'Spectrum',
  description: 'test',
  n_obs: 100,
  n_var: 10,
  obs_columns: [{ name: 'cell_type', dtype: 'categorical', cardinality: 3, values: ['T', 'B', 'M'] }],
  embedding_keys: ['X_umap'],
  available_tools: [],
  permission: { can_chat: true, reason: null },
}

let emit: ((e: ChatEvent) => void) | null = null

beforeEach(() => {
  emit = null
  mockApplyConfig.mockReset()
  mockApplyConfig.mockResolvedValue({ ok: true })
  vi.spyOn(useChatTurnModule, 'useChatTurn').mockReturnValue({
    streaming: false,
    start: vi.fn(async (_s, _m, _t, onEvent) => { emit = onEvent }),
    stop: vi.fn(),
  })
  useAppStore.setState({ plotChangeEpoch: 0 })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function sendAndReceive(payload: Record<string, unknown>) {
  render(<ConversationView slug="spectrum" ctxData={ctx} threadId={null} onThreadOpen={() => {}} />)
  const input = screen.getByPlaceholderText(/ask anything/i)
  fireEvent.change(input, { target: { value: 'do it' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await waitFor(() => expect(emit).not.toBeNull())
  emit!({ type: 'ui_action', payload })
  await waitFor(() => expect(mockApplyConfig).toHaveBeenCalled())
  // let the applyConfig promise settle
  await new Promise((r) => setTimeout(r, 0))
}

describe('ConversationView plot changes', () => {
  it('an applied colour change bumps plotChangeEpoch', async () => {
    await sendAndReceive({ colorBy: 'category', category: 'cell_type' })
    expect(useAppStore.getState().plotChangeEpoch).toBe(1)
  })

  it('a summary-only change does not', async () => {
    await sendAndReceive({ summaryGenes: ['CD8A'] })
    expect(useAppStore.getState().plotChangeEpoch).toBe(0)
  })

  it('a change that failed to apply does not', async () => {
    mockApplyConfig.mockResolvedValue({ ok: false, reason: { kind: 'missing_companion', field: 'gene' } })
    await sendAndReceive({ colorBy: 'gene' })
    expect(useAppStore.getState().plotChangeEpoch).toBe(0)
  })
})

describe('ConversationView signed-out chat', () => {
  it('shows "Sign in to keep your conversations" when chatting signed out', () => {
    const anonCtx = { ...ctx, permission: { can_chat: true, reason: null, anonymous: true } }
    render(<ConversationView slug="spectrum" ctxData={anonCtx} threadId={null} onThreadOpen={() => {}} />)
    const link = screen.getByRole('link', { name: /sign in to keep your conversations/i })
    expect(link.getAttribute('href')).toBe(loginUrl())
  })

  it('no sign-in note when signed in', () => {
    render(<ConversationView slug="spectrum" ctxData={ctx} threadId={null} onThreadOpen={() => {}} />)
    expect(screen.queryByText(/sign in to keep your conversations/i)).toBeNull()
  })

  it("a 429 shows the server's limit message, not the HTTP status", async () => {
    const message = "You've reached the limit for now — try again in an hour, or sign in to keep going."
    vi.spyOn(useChatTurnModule, 'useChatTurn').mockReturnValue({
      streaming: false,
      start: vi.fn(async () => { throw new HttpError(429, JSON.stringify({ detail: message })) }),
      stop: vi.fn(),
    })
    render(<ConversationView slug="spectrum" ctxData={ctx} threadId={null} onThreadOpen={() => {}} />)
    const input = screen.getByPlaceholderText(/ask anything/i)
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(message)).toBeTruthy())
    expect(screen.queryByText(/HTTP 429/)).toBeNull()
  })
})
