import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ChatDockView } from '../ChatDockView'
import type { ChatMessage } from '../../../types/chat'

function msg(partial: Partial<ChatMessage> & { id: string; role: ChatMessage['role']; content: string }): ChatMessage {
  return {
    timestamp: new Date(),
    ...partial,
  }
}

describe('ChatDockView', () => {
  it('renders the ASCII placeholder when there are no messages', () => {
    render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('--- --- ---')).toBeInTheDocument()
  })

  it('renders exactly the messages it receives (slicing is the parent\'s concern)', () => {
    const messages: ChatMessage[] = [
      msg({ id: '3', role: 'user', content: 'third' }),
      msg({ id: '4', role: 'assistant', content: 'fourth' }),
      msg({ id: '5', role: 'user', content: 'fifth' }),
    ]
    render(
      <ChatDockView
        recentMessages={messages}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('third')).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.getByText('fifth')).toBeInTheDocument()
  })

  it('truncates long message content with an ellipsis', () => {
    const long = 'a'.repeat(120)
    render(
      <ChatDockView
        recentMessages={[msg({ id: 'long', role: 'user', content: long })]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    const rendered = screen.getByText(/^a+…$/)
    expect(rendered.textContent!.length).toBeLessThan(long.length)
    expect(rendered.textContent!.endsWith('…')).toBe(true)
  })

  it('clicking the dock body invokes onExpand', () => {
    const onExpand = vi.fn()
    render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        onExpand={onExpand}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('clicking the X invokes onClose and does NOT trigger onExpand', () => {
    const onExpand = vi.fn()
    const onClose = vi.fn()
    render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        onExpand={onExpand}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close chat dock/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExpand).not.toHaveBeenCalled()
  })

  it('expand and close are real <button> elements (keyboard-accessible by default)', () => {
    render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    const expand = screen.getByRole('button', { name: /open chat/i })
    const close = screen.getByRole('button', { name: /close chat dock/i })
    expect(expand.tagName).toBe('BUTTON')
    expect(close.tagName).toBe('BUTTON')
    // Sibling, not nested — close must not be a descendant of expand.
    expect(expand.contains(close)).toBe(false)
  })

  it('shows a connected indicator when status is "connected"', () => {
    const { container, rerender } = render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeTruthy()

    rerender(
      <ChatDockView
        recentMessages={[]}
        status="disconnected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeFalsy()
  })
})
