import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatSheet } from './ChatSheet'
import useAppStore from '../../store/useAppStore'

const chatProps = vi.fn()
const summaryProps = vi.fn()

vi.mock('../../chat/ChatPanel', () => ({
  ChatPanel: (props: Record<string, unknown>) => {
    chatProps(props)
    return <textarea aria-label="message" />
  },
}))
vi.mock('../SummaryPanel', () => ({
  default: (props: Record<string, unknown>) => {
    summaryProps(props)
    return <div>summary</div>
  },
}))

function renderSheet(chatAvailable = true) {
  render(<ChatSheet chatAvailable={chatAvailable} slug="spectrum" resumeThreadId={null} onActiveThreadChange={() => {}} />)
}

function sheetHeight() {
  return parseInt(screen.getByTestId('chat-sheet').style.height, 10)
}

function tapHandle() {
  fireEvent.click(screen.getByRole('button', { name: /resize chat/i }))
}

describe('ChatSheet', () => {
  beforeEach(() => {
    chatProps.mockClear()
    summaryProps.mockClear()
    window.innerHeight = 844
    useAppStore.setState({ plotBottomInset: 0, plotChangeEpoch: 0 })
  })
  afterEach(cleanup)

  it('starts at peek and reports its height as the plot inset', () => {
    renderSheet()
    expect(sheetHeight()).toBe(168)
    expect(useAppStore.getState().plotBottomInset).toBe(168)
  })

  it('shows chat in a new conversation when chat is available', () => {
    renderSheet()
    expect(chatProps).toHaveBeenCalledWith(expect.objectContaining({ slug: 'spectrum', startIn: 'new' }))
    expect(summaryProps).not.toHaveBeenCalled()
  })

  it('shows Summary when chat is not available', () => {
    renderSheet(false)
    expect(summaryProps).toHaveBeenCalledWith(expect.objectContaining({ alwaysOpen: true }))
    expect(chatProps).not.toHaveBeenCalled()
  })

  it('tapping the handle steps peek → half → full → peek', () => {
    renderSheet()
    tapHandle()
    expect(sheetHeight()).toBe(422)
    tapHandle()
    expect(sheetHeight()).toBe(796)
    tapHandle()
    expect(sheetHeight()).toBe(168)
  })

  it('never reports more than the half height as the plot inset', () => {
    // A viewport an agent sends while the sheet is full is applied before the
    // sheet drops to half; fitting to the full sheet would leave no plot.
    renderSheet()
    tapHandle()
    tapHandle()
    expect(sheetHeight()).toBe(796)
    expect(useAppStore.getState().plotBottomInset).toBe(422)
  })

  it('drops from full to half when the plot changes', () => {
    renderSheet()
    tapHandle()
    tapHandle()
    act(() => useAppStore.getState().notePlotChange())
    expect(sheetHeight()).toBe(422)
    expect(useAppStore.getState().plotBottomInset).toBe(422)
  })

  it('stays at peek when the plot changes', () => {
    renderSheet()
    act(() => useAppStore.getState().notePlotChange())
    expect(sheetHeight()).toBe(168)
  })

  it('focusing the message box raises peek to half', () => {
    renderSheet()
    fireEvent.focus(screen.getByLabelText('message'))
    expect(sheetHeight()).toBe(422)
  })

  it('clears the plot inset when it goes away', () => {
    renderSheet()
    cleanup()
    expect(useAppStore.getState().plotBottomInset).toBe(0)
  })
})
