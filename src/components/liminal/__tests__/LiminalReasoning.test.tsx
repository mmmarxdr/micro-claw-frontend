import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LiminalReasoning } from '../LiminalReasoning'

describe('LiminalReasoning', () => {
  it('renders nothing when text is empty', () => {
    const { container } = render(<LiminalReasoning text="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when text is undefined', () => {
    const { container } = render(<LiminalReasoning />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "pondering…" while streaming and no text has started', () => {
    render(<LiminalReasoning text="thinking..." streaming />)
    expect(screen.getByText('pondering…')).toBeInTheDocument()
  })

  it('shows "pondered for {duration}" when complete', () => {
    render(<LiminalReasoning text="reasoning content" duration="6s" />)
    expect(screen.getByText('pondered for 6s')).toBeInTheDocument()
  })

  it('starts collapsed when not streaming', () => {
    render(<LiminalReasoning text="hidden content" duration="2s" />)
    expect(screen.queryByText('hidden content')).not.toBeInTheDocument()
  })

  it('expands when toggled', () => {
    render(<LiminalReasoning text="reveal me" duration="2s" />)
    expect(screen.queryByText('reveal me')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('pondered for 2s'))
    expect(screen.getByText('reveal me')).toBeInTheDocument()
  })

  it('starts open while streaming', () => {
    render(<LiminalReasoning text="live thinking" streaming />)
    expect(screen.getByText(/live thinking/)).toBeInTheDocument()
  })
})
