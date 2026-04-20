import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiminalCode } from '../LiminalCode'

describe('LiminalCode', () => {
  it('renders the lang label in the chrome', () => {
    render(<LiminalCode code="const x = 1" lang="typescript" />)
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('shows the diff badge when showDiff is true', () => {
    render(<LiminalCode code="-old\n+new" lang="typescript" showDiff />)
    expect(screen.getByText('diff')).toBeInTheDocument()
  })

  it('omits the diff badge by default', () => {
    render(<LiminalCode code="const x = 1" lang="typescript" />)
    expect(screen.queryByText('diff')).not.toBeInTheDocument()
  })

  it('shows a copy button by default', () => {
    render(<LiminalCode code="const x = 1" lang="typescript" />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('shows the apply button only when applicable', () => {
    const { rerender } = render(<LiminalCode code="x" lang="text" />)
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument()
    rerender(<LiminalCode code="x" lang="text" applicable />)
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
  })

  it('hides chrome entirely when hideChrome is true', () => {
    render(<LiminalCode code="x" lang="text" hideChrome />)
    expect(screen.queryByText('text')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
  })

  it('highlights Go keywords (package, func, return)', () => {
    const code = `package main

func hello() string {
\treturn "world"
}`
    const { container } = render(<LiminalCode code={code} lang="go" />)
    // Find spans whose text content matches a keyword and check the inline color.
    const spans = Array.from(container.querySelectorAll('pre span')) as HTMLSpanElement[]
    const pkg = spans.find((s) => s.textContent === 'package')
    const fn = spans.find((s) => s.textContent === 'func')
    const ret = spans.find((s) => s.textContent === 'return')
    expect(pkg?.style.color).toBe('rgb(214, 123, 158)') // CODE_PALETTE.keyword
    expect(fn?.style.color).toBe('rgb(214, 123, 158)')
    expect(ret?.style.color).toBe('rgb(214, 123, 158)')
    // String literal should be sage green.
    const str = spans.find((s) => s.textContent === '"world"')
    expect(str?.style.color).toBe('rgb(184, 201, 122)') // CODE_PALETTE.string
  })

  it('falls back to plain rendering for unknown languages', () => {
    const { container } = render(<LiminalCode code={'banana republic'} lang="malbolge" />)
    // No keyword tokenization → all text rendered as a single ident-colored span per word/punct.
    expect(container.querySelector('pre')?.textContent).toContain('banana republic')
  })

  it('renders a gutter line for each line of code', () => {
    const { container } = render(<LiminalCode code={'a\nb\nc'} lang="text" />)
    // Three lines → "1", "2", "3" gutter labels.
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    // Source content is preserved in the pre element.
    expect(container.querySelector('pre')?.textContent).toContain('a')
  })
})
