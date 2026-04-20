import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Kbd } from '../Kbd'

describe('Kbd', () => {
  it('renders the provided shortcut text', () => {
    render(<Kbd>⌘ K</Kbd>)
    expect(screen.getByText('⌘ K')).toBeInTheDocument()
  })

  it('renders mixed glyph + word combos verbatim', () => {
    render(<Kbd>Ctrl ⇧ F</Kbd>)
    expect(screen.getByText('Ctrl ⇧ F')).toBeInTheDocument()
  })
})
