import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationView } from './ConversationView'
import * as useChatTurnModule from './useChatTurn'
import type { ChatEvent, ContextResponse } from './types'
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
