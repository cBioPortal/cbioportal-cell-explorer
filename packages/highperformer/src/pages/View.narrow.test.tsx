import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { narrow, narrowProps, chatProps } = vi.hoisted(() => ({
  narrow: { value: false },
  narrowProps: [] as Record<string, unknown>[],
  chatProps: [] as Record<string, unknown>[],
}))

vi.mock('@deck.gl/react', async () => {
  const React = await import('react')
  return { DeckGL: React.forwardRef(function DeckGL() { return null }) }
})
vi.mock('../api', () => ({
  api: { GET: vi.fn().mockResolvedValue({ data: undefined }), POST: vi.fn().mockResolvedValue({ data: undefined }) },
}))
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class MockPool {
    dispatch = vi.fn(() => new Promise(() => {}))
    clearQueue = vi.fn()
    dispose() {}
  },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class MockWorker {} }))
vi.mock('../hooks/useNarrowLayout', () => ({ useNarrowLayout: () => narrow.value }))
vi.mock('../components/narrow/NarrowViewLayout', () => ({
  NarrowViewLayout: (props: Record<string, unknown>) => {
    narrowProps.push(props)
    return <div>narrow layout</div>
  },
}))
vi.mock('../chat/ChatPanel', async () => {
  const React = await import('react')
  return {
    ChatPanel: (props: { onActiveThreadChange?: (id: string | null) => void }) => {
      chatProps.push(props)
      React.useEffect(() => { props.onActiveThreadChange?.('t1') }, [])
      return <div>desktop chat</div>
    },
  }
})

import useAppStore from '../store/useAppStore'
import View from './View'

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/view?dataset=spectrum']}>
      <View />
    </MemoryRouter>,
  )
}

describe('View narrow layout', () => {
  beforeEach(() => {
    narrow.value = false
    narrowProps.length = 0
    chatProps.length = 0
    useAppStore.setState({
      ...useAppStore.getInitialState(),
      backendInfo: { auth_enabled: false, chat_enabled: true } as never,
      backendProbed: true,
      datasetSlug: 'spectrum',
      datasetUrl: 'https://cdn/spectrum.zarr',
      catalogDatasets: [{ slug: 'spectrum', name: 'MSK SPECTRUM', chat_enabled: true } as never],
      openCatalogDataset: vi.fn(async () => {}),
    })
  })
  afterEach(cleanup)

  it('narrow screens get the plot-and-sheet layout', () => {
    narrow.value = true
    renderView()
    expect(screen.getByText('narrow layout')).toBeTruthy()
    expect(narrowProps.at(-1)).toMatchObject({ title: 'MSK SPECTRUM', chatAvailable: true, slug: 'spectrum' })
    expect(document.querySelector('.ant-layout-sider')).toBeNull()
  })

  it("wide screens get today's layout", () => {
    renderView()
    expect(screen.queryByText('narrow layout')).toBeNull()
    expect(document.querySelector('.ant-layout-sider')).not.toBeNull()
  })

  it('narrow layout switches to pan', () => {
    useAppStore.setState({ selectionTool: 'lasso' })
    narrow.value = true
    renderView()
    expect(useAppStore.getState().selectionTool).toBe('pan')
  })

  it('the active chat thread carries across a layout switch', async () => {
    const { rerender } = renderView()
    fireEvent.click(screen.getByRole('tab', { name: 'Chat' }))
    await screen.findByText('desktop chat')
    narrow.value = true
    act(() => {
      rerender(
        <MemoryRouter initialEntries={['/view?dataset=spectrum']}>
          <View />
        </MemoryRouter>,
      )
    })
    expect(narrowProps.at(-1)).toMatchObject({ resumeThreadId: 't1' })
  })
})
