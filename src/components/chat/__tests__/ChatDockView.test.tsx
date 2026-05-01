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

interface RenderOpts {
  recentMessages?: ChatMessage[]
  status?: string
  input?: string
  onInputChange?: (v: string) => void
  onSend?: () => void
  isWaiting?: boolean
  onExpand?: () => void
  onClose?: () => void
}

function renderDock(opts: RenderOpts = {}) {
  return render(
    <ChatDockView
      recentMessages={opts.recentMessages ?? []}
      status={opts.status ?? 'connected'}
      input={opts.input ?? ''}
      onInputChange={opts.onInputChange ?? (() => {})}
      onSend={opts.onSend ?? (() => {})}
      isWaiting={opts.isWaiting ?? false}
      onExpand={opts.onExpand ?? (() => {})}
      onClose={opts.onClose ?? (() => {})}
    />,
  )
}

describe('ChatDockView', () => {
  it('renders the ASCII placeholder when there are no messages', () => {
    renderDock()
    expect(screen.getByText('--- --- ---')).toBeInTheDocument()
  })

  it('renders exactly the messages it receives (slicing is the parent\'s concern)', () => {
    const messages: ChatMessage[] = [
      msg({ id: '3', role: 'user', content: 'third' }),
      msg({ id: '4', role: 'assistant', content: 'fourth' }),
      msg({ id: '5', role: 'user', content: 'fifth' }),
    ]
    renderDock({ recentMessages: messages })
    expect(screen.getByText('third')).toBeInTheDocument()
    expect(screen.getByText('fourth')).toBeInTheDocument()
    expect(screen.getByText('fifth')).toBeInTheDocument()
  })

  it('truncates long message content with an ellipsis', () => {
    const long = 'a'.repeat(120)
    renderDock({ recentMessages: [msg({ id: 'long', role: 'user', content: long })] })
    const rendered = screen.getByText(/^a+…$/)
    expect(rendered.textContent!.length).toBeLessThan(long.length)
    expect(rendered.textContent!.endsWith('…')).toBe(true)
  })

  it('clicking the header expand button invokes onExpand', () => {
    const onExpand = vi.fn()
    renderDock({ onExpand })
    fireEvent.click(screen.getByRole('button', { name: /open chat/i }))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('clicking the X invokes onClose and does NOT trigger onExpand', () => {
    const onExpand = vi.fn()
    const onClose = vi.fn()
    renderDock({ onExpand, onClose })
    fireEvent.click(screen.getByRole('button', { name: /close chat dock/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExpand).not.toHaveBeenCalled()
  })

  it('expand and close are real <button> elements (keyboard-accessible by default)', () => {
    renderDock()
    const expand = screen.getByRole('button', { name: /open chat/i })
    const close = screen.getByRole('button', { name: /close chat dock/i })
    expect(expand.tagName).toBe('BUTTON')
    expect(close.tagName).toBe('BUTTON')
    expect(expand.contains(close)).toBe(false)
  })

  it('shows a connected indicator when status is "connected"', () => {
    const { container, rerender } = render(
      <ChatDockView
        recentMessages={[]}
        status="connected"
        input=""
        onInputChange={() => {}}
        onSend={() => {}}
        isWaiting={false}
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeTruthy()

    rerender(
      <ChatDockView
        recentMessages={[]}
        status="disconnected"
        input=""
        onInputChange={() => {}}
        onSend={() => {}}
        isWaiting={false}
        onExpand={() => {}}
        onClose={() => {}}
      />,
    )
    expect(container.querySelector('.liminal-breathe')).toBeFalsy()
  })

  it('typing in the textarea forwards to onInputChange', () => {
    const onInputChange = vi.fn()
    renderDock({ onInputChange })
    const textarea = screen.getByRole('textbox', { name: /type a message/i }) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(onInputChange).toHaveBeenCalledWith('hello')
  })

  it('Enter on the textarea triggers onSend when input is non-empty', () => {
    const onSend = vi.fn()
    renderDock({ input: 'ready', onSend })
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('Enter on an empty input does NOT trigger onSend', () => {
    const onSend = vi.fn()
    renderDock({ input: '   ', onSend })
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Shift+Enter does NOT trigger onSend (newline pass-through)', () => {
    const onSend = vi.fn()
    renderDock({ input: 'multi', onSend })
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Enter does NOT trigger onSend while a turn is in flight (isWaiting)', () => {
    const onSend = vi.fn()
    renderDock({ input: 'ready', isWaiting: true, onSend })
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('Enter does NOT trigger onSend while disconnected', () => {
    const onSend = vi.fn()
    renderDock({ input: 'ready', status: 'disconnected', onSend })
    const textarea = screen.getByRole('textbox', { name: /type a message/i })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('clicking the send button triggers onSend when input is valid', () => {
    const onSend = vi.fn()
    renderDock({ input: 'ready', onSend })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('send button is disabled when there is no input', () => {
    renderDock({ input: '' })
    const send = screen.getByRole('button', { name: /send message/i }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
  })

  it('send button is disabled while waiting', () => {
    renderDock({ input: 'ready', isWaiting: true })
    const send = screen.getByRole('button', { name: /send message/i }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
  })

  it('textarea is disabled while waiting', () => {
    renderDock({ isWaiting: true })
    const textarea = screen.getByRole('textbox', { name: /type a message/i }) as HTMLTextAreaElement
    expect(textarea.disabled).toBe(true)
  })
})
