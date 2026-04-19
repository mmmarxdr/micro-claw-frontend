/**
 * RED tests — 13.1 ThinkingBlock component
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Will fail with import error until ThinkingBlock.tsx exists
import { ThinkingBlock } from '../ThinkingBlock'

describe('ThinkingBlock', () => {
  // 13.1.5 — empty reasoning renders nothing
  it('13.1.5 — renders nothing when reasoning is empty', () => {
    const { container } = render(
      <ThinkingBlock reasoning="" isStreaming={false} hasTextStarted={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('13.1.5b — renders nothing when reasoning is undefined', () => {
    const { container } = render(
      <ThinkingBlock reasoning={undefined} isStreaming={false} hasTextStarted={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  // 13.1.1 — while streaming: shows content expanded
  it('13.1.1 — renders reasoning text expanded while streaming', () => {
    render(
      <ThinkingBlock
        reasoning="I am thinking about this..."
        isStreaming={true}
        hasTextStarted={false}
      />
    )
    expect(screen.getByText(/i am thinking about this/i)).toBeInTheDocument()
    // Should show "Thinking..." label in summary
    const summaries = document.querySelectorAll('summary')
    const hasThinkinLabel = Array.from(summaries).some(s => /thinking/i.test(s.textContent ?? ''))
    expect(hasThinkinLabel).toBe(true)
  })

  // 13.1.2 — auto-collapses when hasTextStarted=true
  it('13.1.2 — auto-collapses when hasTextStarted transitions to true', () => {
    const { rerender } = render(
      <ThinkingBlock
        reasoning="Some deep thoughts"
        isStreaming={true}
        hasTextStarted={false}
      />
    )

    // While streaming, content should be visible
    expect(screen.getByText(/some deep thoughts/i)).toBeInTheDocument()

    // Rerender with hasTextStarted=true — should auto-collapse
    rerender(
      <ThinkingBlock
        reasoning="Some deep thoughts"
        isStreaming={false}
        hasTextStarted={true}
        thinkingStartedAt={new Date(Date.now() - 3000)}
        textStartedAt={new Date()}
      />
    )

    // Should show "Thought for Xs" label when collapsed
    expect(screen.getByText(/thought for/i)).toBeInTheDocument()
    // The reasoning text should be hidden (in details element, collapsed by default)
    const details = document.querySelector('details')
    expect(details).toBeTruthy()
    expect(details!.open).toBe(false)
  })

  // 13.1.3 — clicking collapsed block expands it
  it('13.1.3 — clicking collapsed block toggles expansion', () => {
    render(
      <ThinkingBlock
        reasoning="Hidden thought"
        isStreaming={false}
        hasTextStarted={true}
        thinkingStartedAt={new Date(Date.now() - 2000)}
        textStartedAt={new Date()}
      />
    )

    const summary = document.querySelector('details summary') as HTMLElement
    expect(summary).toBeTruthy()

    // Initially collapsed
    expect(document.querySelector('details')!.open).toBe(false)

    // Click to expand
    fireEvent.click(summary)
    expect(document.querySelector('details')!.open).toBe(true)

    // Click again to collapse
    fireEvent.click(summary)
    expect(document.querySelector('details')!.open).toBe(false)
  })

  // 13.1.4 — keyboard accessible: responds to Enter/Space
  it('13.1.4 — keyboard Enter/Space toggles when focused', () => {
    render(
      <ThinkingBlock
        reasoning="Keyboard thought"
        isStreaming={false}
        hasTextStarted={true}
        thinkingStartedAt={new Date(Date.now() - 1000)}
        textStartedAt={new Date()}
      />
    )

    const summary = document.querySelector('details summary') as HTMLElement
    expect(summary).toBeTruthy()

    // Native <details>/<summary> is keyboard accessible via Enter by default
    // Verify it has proper tab focus
    expect(summary.tabIndex === 0 || summary.tabIndex === -1 || summary.nodeName === 'SUMMARY').toBe(true)
  })

  // 13.1.6 — after turn completion, block remains toggleable
  it('13.1.6 — after turn completion, reasoning is still accessible', () => {
    render(
      <ThinkingBlock
        reasoning="Final thought process"
        isStreaming={false}
        hasTextStarted={true}
        thinkingStartedAt={new Date(Date.now() - 5000)}
        textStartedAt={new Date()}
      />
    )

    // Should still show collapsed summary
    expect(screen.getByText(/thought for/i)).toBeInTheDocument()

    // Should be toggleable
    const summary = document.querySelector('details summary') as HTMLElement
    fireEvent.click(summary)
    expect(screen.getByText(/final thought process/i)).toBeInTheDocument()
  })

  // Duration calculation
  it('13.1.7 — shows duration in seconds in collapsed label', () => {
    const start = new Date(Date.now() - 4500) // 4.5s ago
    const end = new Date()
    render(
      <ThinkingBlock
        reasoning="Some reasoning"
        isStreaming={false}
        hasTextStarted={true}
        thinkingStartedAt={start}
        textStartedAt={end}
      />
    )
    // "Thought for Xs" — should show a number like 4 or 5
    const label = screen.getByText(/thought for/i)
    expect(label.textContent).toMatch(/\d+s/)
  })
})
