import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../pool/WorkerPool', () => ({
  WorkerPool: class MockPool {
    dispatch = vi.fn(() => new Promise(() => {}))
    clearQueue = vi.fn()
    dispose() {}
  },
}))
vi.mock('../../workers/universal.worker.ts?worker', () => ({ default: class MockWorker {} }))
vi.mock('./ChatSheet', () => ({ ChatSheet: () => <div>chat sheet</div> }))
vi.mock('../ColorBySection', () => ({ default: () => <div>color-by-section</div> }))
vi.mock('../ControlsPanel', () => ({ ControlsPanel: () => <div>controls-panel</div> }))
vi.mock('../SummaryPanel', () => ({ default: () => <div>summary-panel</div> }))

import { NarrowViewLayout } from './NarrowViewLayout'
import useAppStore from '../../store/useAppStore'
import type { SpatialSelectionGroup } from '../../store/useAppStore'

function renderLayout(chatAvailable = true) {
  render(
    <MemoryRouter>
      <NarrowViewLayout
        plot={<div>the plot</div>}
        title="MSK SPECTRUM TME 2022"
        chatAvailable={chatAvailable}
        slug="spectrum"
        resumeThreadId={null}
        onActiveThreadChange={() => {}}
      />
    </MemoryRouter>,
  )
}

const group: SpatialSelectionGroup = {
  id: 1, type: 'rectangle', polygon: [[0, 0], [1, 0], [1, 1]], indices: new Uint32Array([0]), color: [255, 0, 0],
}

const brand = {
  name: 'BTC', tagline: 't', logo_on_light: '/brand/light.png', logo_on_dark: '/brand/dark.png',
  logo_alt: 'BTC logo', logo_href: null, colors: { ink: '#000', theme_color: '#000' },
}

describe('NarrowViewLayout', () => {
  const realTop = window.top
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
  })
  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'top', { value: realTop, configurable: true })
  })

  it('top bar shows Back, the title and settings; the plot and sheet are below', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /back/i }).getAttribute('href')).toBe('/')
    expect(screen.getByText('MSK SPECTRUM TME 2022')).toBeTruthy()
    expect(screen.getByRole('button', { name: /settings/i })).toBeTruthy()
    expect(screen.getByText('the plot')).toBeTruthy()
    expect(screen.getByText('chat sheet')).toBeTruthy()
  })

  it('no Back button when embedded', () => {
    Object.defineProperty(window, 'top', { value: {}, configurable: true })
    renderLayout()
    expect(screen.queryByRole('link', { name: /back/i })).toBeNull()
  })

  it('brand logo shows for a branded deployment and not by default', () => {
    renderLayout()
    expect(screen.queryByAltText('BTC logo')).toBeNull()
    cleanup()
    useAppStore.setState({ backendInfo: { brand } as never })
    renderLayout()
    expect(screen.getByAltText('BTC logo')).toBeTruthy()
  })

  it('colour chip names the current colouring and opens the picker', async () => {
    useAppStore.setState({ colorMode: 'category', selectedObsColumn: 'cell_type' })
    renderLayout()
    expect(screen.getByText('Color: cell_type')).toBeTruthy()
    cleanup()
    useAppStore.setState({ colorMode: 'gene', selectedObsColumn: null, selectedGene: 'CD8A' })
    renderLayout()
    expect(screen.getByText('Color: CD8A')).toBeTruthy()
    cleanup()
    useAppStore.setState({ colorMode: 'category', selectedObsColumn: null, selectedGene: null })
    renderLayout()
    fireEvent.click(screen.getByText('Color: none'))
    await waitFor(() => expect(screen.getByText('color-by-section')).toBeTruthy())
  })

  it('filter chip appears with a filter and Clear clears it', () => {
    renderLayout()
    expect(screen.queryByText('Filter active')).toBeNull()
    cleanup()
    useAppStore.setState({ selectionGroups: [group] })
    renderLayout()
    expect(screen.getByText('Filter active')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(useAppStore.getState().selectionGroups).toEqual([])
  })

  it('settings shows Controls and Summary tabs when chat is available', async () => {
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Controls' })).toBeTruthy())
    expect(screen.getByRole('tab', { name: 'Summary' })).toBeTruthy()
    expect(screen.getByText('controls-panel')).toBeTruthy()
  })

  it('settings shows Controls only when chat is not available', async () => {
    renderLayout(false)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    await waitFor(() => expect(screen.getByText('controls-panel')).toBeTruthy())
    expect(screen.queryByRole('tab', { name: 'Summary' })).toBeNull()
  })
})
