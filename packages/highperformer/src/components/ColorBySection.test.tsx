import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

afterEach(() => cleanup())

// Mock WorkerPool + worker (same pattern as other tests in this package).
vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = vi.fn().mockResolvedValue({}); clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('../store/useAppStore')
const { default: ColorBySection } = await import('./ColorBySection')

describe('ColorBySection — cluster labels', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    useAppStore.setState({
      obsColumnNames: ['cell_type', 'leiden'],
      varNames: ['CD8A'],
    } as any)
  })

  it('renders the Show cluster labels switch in category mode', () => {
    useAppStore.setState({ colorMode: 'category' } as any)
    render(<ColorBySection />)
    expect(screen.getByText('Show cluster labels')).toBeDefined()
  })

  it('renders the Show cluster labels switch in gene mode (decoupled)', () => {
    useAppStore.setState({ colorMode: 'gene' } as any)
    render(<ColorBySection />)
    expect(screen.getByText('Show cluster labels')).toBeDefined()
  })

  it('renders the Label by picker', () => {
    useAppStore.setState({ colorMode: 'category', selectedObsColumn: 'cell_type' } as any)
    render(<ColorBySection />)
    expect(screen.getByText('Label by:')).toBeDefined()
  })

  it('shows the inline hint when switch is on AND no effective column resolves', () => {
    useAppStore.setState({
      colorMode: 'gene',
      showCategoryLabels: true,
      categoryLabelsObsColumn: null,
    } as any)
    render(<ColorBySection />)
    expect(screen.getByText('Select a column to label by')).toBeDefined()
  })

  it('hides the inline hint when an effective column resolves', () => {
    useAppStore.setState({
      colorMode: 'category',
      selectedObsColumn: 'cell_type',
      showCategoryLabels: true,
      categoryLabelsObsColumn: null,
    } as any)
    render(<ColorBySection />)
    expect(screen.queryByText('Select a column to label by')).toBeNull()
  })

  it('hides the inline hint when the switch is off', () => {
    useAppStore.setState({
      colorMode: 'gene',
      showCategoryLabels: false,
      categoryLabelsObsColumn: null,
    } as any)
    render(<ColorBySection />)
    expect(screen.queryByText('Select a column to label by')).toBeNull()
  })

  it('flipping the switch updates the store', () => {
    useAppStore.setState({ colorMode: 'category', selectedObsColumn: 'cell_type' } as any)
    render(<ColorBySection />)
    const switchEl = screen.getByRole('switch', { name: /show cluster labels/i })
    fireEvent.click(switchEl)
    expect(useAppStore.getState().showCategoryLabels).toBe(true)
  })

  it('picking an obs column from the picker calls setCategoryLabelsObsColumn', () => {
    // antd Select's onChange does not fire via fireEvent.click in jsdom; call the store
    // action directly and verify it round-trips through state correctly.
    useAppStore.setState({ colorMode: 'gene', categoryLabelsObsColumn: null } as any)
    render(<ColorBySection />)

    // The Label by picker shows "Pick a column" placeholder in gene mode.
    expect(screen.getByText('Pick a column')).toBeDefined()

    // Drive the action directly and verify state is updated.
    useAppStore.getState().setCategoryLabelsObsColumn('leiden')
    expect(useAppStore.getState().categoryLabelsObsColumn).toBe('leiden')
  })
})

describe('ColorBySection — cardinality note', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState())
    useAppStore.setState({
      obsColumnNames: ['leiden'],
      colorMode: 'category',
      selectedObsColumn: 'leiden',
    } as any)
  })

  it('renders the repeat note as an info alert when the column is still colored', () => {
    useAppStore.setState({
      categoryWarning: '30 values — colors repeat',
      categoryMap: [{ label: 'a', color: [0, 0, 0] }],
      _categoryCodes: new Uint16Array([0]),
    } as any)
    const { container } = render(<ColorBySection />)
    expect(screen.getByText('30 values — colors repeat')).toBeDefined()
    expect(container.querySelector('.ant-alert-info')).not.toBeNull()
    expect(container.querySelector('.ant-alert-warning')).toBeNull()
  })

  it('renders a warning alert when coloring is blocked (no categoryMap)', () => {
    useAppStore.setState({
      categoryWarning: '99999 distinct values — too many to color; likely an ID or continuous column',
      categoryMap: [],
      _categoryCodes: null,
    } as any)
    const { container } = render(<ColorBySection />)
    expect(container.querySelector('.ant-alert-warning')).not.toBeNull()
    expect(container.querySelector('.ant-alert-info')).toBeNull()
  })
})
