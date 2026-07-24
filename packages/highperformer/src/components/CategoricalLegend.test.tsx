import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'

vi.mock('../pool/WorkerPool', () => ({
  WorkerPool: class { dispatch = vi.fn().mockResolvedValue({}); clearQueue = vi.fn(); dispose() {} },
}))
vi.mock('../workers/universal.worker.ts?worker', () => ({ default: class {} }))

const { default: useAppStore } = await import('../store/useAppStore')
const { default: CategoricalLegend } = await import('./CategoricalLegend')

afterEach(() => cleanup())

function mapOf(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `c${i}`, color: [0, 0, 0] as [number, number, number] }))
}

describe('CategoricalLegend list cap', () => {
  it('renders per-category rows at or below the cap', () => {
    useAppStore.setState(useAppStore.getInitialState())
    useAppStore.setState({ categoryMap: mapOf(3) } as any)
    render(<CategoricalLegend />)
    expect(screen.getByText('c0')).toBeDefined()
    expect(screen.getByText('c2')).toBeDefined()
  })

  it('renders a compact summary above the cap (no per-row list)', () => {
    useAppStore.setState(useAppStore.getInitialState())
    useAppStore.setState({ categoryMap: mapOf(501) } as any)
    render(<CategoricalLegend />)
    expect(screen.queryByText('c0')).toBeNull()
    expect(screen.getByText(/501 categories/)).toBeDefined()
    expect(screen.getByText(/too many to list/)).toBeDefined()
  })
})
