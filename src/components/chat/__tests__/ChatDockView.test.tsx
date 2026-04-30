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
        messages={[]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('--- --- ---')).toBeInTheDocument()
  })

  it('shows only the last 3 messages even when more are passed', () => {
    const messages: ChatMessage[] = [
      msg({ id: '1', role: 'user', content: 'first' }),
      msg({ id: '2', role: 'assistant', content: 'second' }),
      msg({ id: '3', role: 'user', content: 'third' }),
      msg({ id: '4', role: 'assistant', content: 'fourth' }),
      msg({ id: '5', role: 'user', content: 'fifth' }),
    ]
    render(
      <ChatDockView
        messages={messages}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText('first')).not.toBeInTheDocument()
    expect(screen.queryByText('second')).not.toBeInTheDocument()
    expect(screen.getByText('third')).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.getByText('fifth')).toBeInTheDocument()
  })

  it('truncates long message content with an ellipsis', () => {
    const long = 'a'.repeat(120)
    render(
      <ChatDockView
        messages={[msg({ id: 'long', role: 'user', content: long })]}
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
        messages={[]}
        status="connected"
        onExpand={onExpand}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('clicking the X invokes onClose and does NOT bubble to onExpand', () => {
    const onExpand = vi.fn()
    const onClose = vi.fn()
    render(
      <ChatDockView
        messages={[]}
        status="connected"
        onExpand={onExpand}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close chat dock/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExpand).not.toHaveBeenCalled()
  })

  it('Enter/Space on the dock invokes onExpand for keyboard accessibility', () => {
    const onExpand = vi.fn()
    render(
      <ChatDockView
        messages={[]}
        status="connected"
        onExpand={onExpand}
        onClose={() => {}}
      />,
    )
    const dock = screen.getByRole('button', { name: /open chat/i })
    fireEvent.keyDown(dock, { key: 'Enter' })
    fireEvent.keyDown(dock, { key: ' ' })
    expect(onExpand).toHaveBeenCalledTimes(2)
  })

  it('shows a connected indicator when status is "connected"', () => {
    const { container, rerender } = render(
      <ChatDockView
        messages={[]}
        status="connected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeTruthy()

    rerender(
      <ChatDockView
        messages={[]}
        status="disconnected"
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeFalsy()
  })
})
