import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Selection and summary changes start summary work on the worker pool; jsdom has no Worker.
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class MockPool {
    dispatch = vi.fn(() => new Promise(() => {}))
    clearQueue = vi.fn()
    dispose() {}
  },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class MockWorker {} }))
import { ControlsPanel } from './ControlsPanel'
import SummaryPanel from './SummaryPanel'
import useAppStore from '../store/useAppStore'
import type { SpatialSelectionGroup } from '../store/useAppStore'

function renderPanel(props: Parameters<typeof ControlsPanel>[0] = {}) {
  render(
    <MemoryRouter>
      <ControlsPanel {...props} />
    </MemoryRouter>,
  )
}

const group: SpatialSelectionGroup = {
  id: 1,
  type: 'rectangle',
  polygon: [[0, 0], [1, 0], [1, 1]],
  indices: new Uint32Array([0, 1]),
  color: [255, 0, 0],
}

describe('ControlsPanel', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...useAppStore.getInitialState(),
      backendInfo: { auth_enabled: true } as never,
      authChecked: true,
      user: null,
    })
  })
  afterEach(cleanup)

  it('shows dataset, embedding, colour-by, rendering and account', () => {
    renderPanel()
    expect(screen.getByText('Dataset')).toBeTruthy()
    expect(screen.getByText('Embedding')).toBeTruthy()
    expect(screen.getByText('Color By')).toBeTruthy()
    expect(screen.getByText('Rendering')).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy()
  })

  it('shows the branding header by default and omits it with showBranding={false}', () => {
    renderPanel()
    expect(screen.getByText(/Cell Explorer/)).toBeTruthy()
    cleanup()
    renderPanel({ showBranding: false })
    expect(screen.queryByText(/Cell Explorer/)).toBeNull()
  })

  it('showDisplayMode shows Dim/Hide only while a filter is active', () => {
    renderPanel({ showDisplayMode: true })
    expect(screen.queryByText('Filtered cells')).toBeNull()
    cleanup()
    useAppStore.setState({ selectionGroups: [group] })
    renderPanel({ showDisplayMode: true })
    expect(screen.getByText('Filtered cells')).toBeTruthy()
    fireEvent.click(screen.getByText('Hide'))
    expect(useAppStore.getState().selectionDisplayMode).toBe('hide')
  })
})

describe('SummaryPanel alwaysOpen', () => {
  afterEach(cleanup)

  it('renders even when summaryPanelOpen is false', () => {
    useAppStore.setState({ ...useAppStore.getInitialState(), summaryPanelOpen: false })
    const { container: closed } = render(<SummaryPanel collapsed={false} onExpand={() => {}} />)
    expect(closed.innerHTML).toBe('')
    cleanup()
    const { container: open } = render(<SummaryPanel alwaysOpen collapsed={false} onExpand={() => {}} />)
    expect(open.innerHTML).not.toBe('')
  })
})
