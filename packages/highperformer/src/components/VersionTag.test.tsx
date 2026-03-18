import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VersionTag } from './VersionTag'

describe('VersionTag', () => {
  it('renders version and commit hash', () => {
    render(<VersionTag version="0.1.0" commitHash="abc1234" />)
    expect(screen.getByText('v0.1.0')).toBeDefined()
    expect(screen.getByText('(abc1234)')).toBeDefined()
  })

  it('renders with different values', () => {
    render(<VersionTag version="1.2.3" commitHash="def5678" />)
    expect(screen.getByText('v1.2.3')).toBeDefined()
    expect(screen.getByText('(def5678)')).toBeDefined()
  })
})
