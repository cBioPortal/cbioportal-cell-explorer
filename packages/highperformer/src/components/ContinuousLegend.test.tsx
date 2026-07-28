import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import ContinuousLegend from './ContinuousLegend'

afterEach(() => cleanup())

describe('ContinuousLegend (props-based)', () => {
  it('renders the label and range from props', () => {
    render(
      <ContinuousLegend
        range={{ min: 0.12, max: 3.45 }}
        scale={[[0, 0, 0], [255, 255, 255]]}
        label="percent.rb"
      />,
    )
    expect(screen.getByText('percent.rb')).toBeDefined()
    expect(screen.getByText('0.12')).toBeDefined()
    expect(screen.getByText('3.45')).toBeDefined()
  })

  it('returns nothing when range is null', () => {
    const { container } = render(
      <ContinuousLegend range={null} scale={[[0, 0, 0]]} label="x" />,
    )
    expect(container.firstChild).toBeNull()
  })
})
