import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ChatDockView } from '../ChatDockView'
import type { ChatMessage } from '../../../types/chat'

// JSDOM doesn't implement scrollIntoView; the dock's auto-scroll effect
// would otherwise throw on render. Stub once.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

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

  it('renders full message content without truncation', () => {
    const long = 'BBB' + 'a'.repeat(200) + 'ZZZ'
    renderDock({ recentMessages: [msg({ id: 'long', role: 'user', content: long })] })
    const rendered = screen.getByText(long)
    expect(rendered.textContent).toBe(long)
  })

  it('preserves newlines in message content (whitespace-pre-wrap)', () => {
    const multiline = 'line one\nline two\nline three'
    const { container } = renderDock({
      recentMessages: [msg({ id: 'm', role: 'assistant', content: multiline })],
    })
    // getByText normalizes whitespace, so query by attribute and verify the
    // raw textContent kept the newlines + the CSS that renders them as such.
    const span = container.querySelector('span[style*="pre-wrap"]') as HTMLElement
    expect(span).toBeTruthy()
    expect(span.textContent).toBe(multiline)
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

  it('shows a thinking indicator when waiting and no streaming assistant yet', () => {
    const messages: ChatMessage[] = [
      msg({ id: 'u1', role: 'user', content: 'dame 5 factos random' }),
    ]
    renderDock({ recentMessages: messages, isWaiting: true })
    // Two "daimon" labels would mean: one for a streaming row + one for the
    // indicator. Here we expect ONLY the thinking indicator (no streaming row),
    // and its content is "…".
    const ellipses = screen.getByText('…')
    expect(ellipses).toBeInTheDocument()
    expect(ellipses.classList.contains('liminal-breathe')).toBe(true)
  })

  it('does NOT show the thinking indicator while a streaming assistant message is live', () => {
    const messages: ChatMessage[] = [
      msg({ id: 'u1', role: 'user', content: 'dame 5 factos random' }),
      msg({ id: 'a1', role: 'assistant', content: 'Sure', isStreaming: true }),
    ]
    renderDock({ recentMessages: messages, isWaiting: true })
    expect(screen.queryByText('…')).not.toBeInTheDocument()
  })

  it('does NOT show the thinking indicator when not waiting', () => {
    renderDock({ isWaiting: false })
    expect(screen.queryByText('…')).not.toBeInTheDocument()
  })

  it('streaming assistant message renders the full content (no truncation)', () => {
    // The dock is a real chat surface, not a preview — both head and tail of a
    // long streaming response must be present in the DOM (the user scrolls
    // within the messages container to read).
    const long = 'BBB' + 'a'.repeat(200) + 'ZZZ'
    const messages: ChatMessage[] = [
      msg({ id: 'u1', role: 'user', content: 'go' }),
      msg({ id: 'a1', role: 'assistant', content: long, isStreaming: true }),
    ]
    renderDock({ recentMessages: messages })
    expect(screen.getByText(long)).toBeInTheDocument()
  })
})
