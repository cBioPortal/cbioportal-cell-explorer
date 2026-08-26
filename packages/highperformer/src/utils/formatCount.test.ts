import { describe, it, expect } from 'vitest'
import { formatCount } from './formatCount'

describe('formatCount', () => {
  it('leaves counts under a thousand alone', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(942)).toBe('942')
  })

  it('drops to one decimal only below ten of a unit', () => {
    expect(formatCount(1200)).toBe('1.2K')
    expect(formatCount(31815)).toBe('32K')
    expect(formatCount(4200000)).toBe('4.2M')
    expect(formatCount(927205)).toBe('927K')
  })

  it('trims a trailing .0 rather than showing it', () => {
    expect(formatCount(2000)).toBe('2K')
    expect(formatCount(3000000)).toBe('3M')
  })

  it('scales to billions', () => {
    expect(formatCount(2_400_000_000)).toBe('2.4B')
  })

  it('renders a dash for values that are not real counts', () => {
    expect(formatCount(NaN)).toBe('—')
    expect(formatCount(-5)).toBe('—')
  })
})
