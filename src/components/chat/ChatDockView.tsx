import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'
import type { ChatMessage } from '../../types/chat'

interface ChatDockViewProps {
  recentMessages: ChatMessage[]
  status: string
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isWaiting: boolean
  onExpand: () => void
  onClose: () => void
}

function ChatDockViewImpl({
  recentMessages,
  status,
  input,
  onInputChange,
  onSend,
  isWaiting,
  onExpand,
  onClose,
}: ChatDockViewProps) {
  // Mount-time fade+scale, no keyframe in global CSS.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const isConnected = status === 'connected'
  const dotColor = isConnected ? 'var(--accent)' : 'var(--ink-muted)'
  const canSend = !isWaiting && isConnected && input.trim().length > 0

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Match LiminalInput convention: Enter sends, Shift+Enter newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSend()
    }
  }

  // Auto-scroll the messages list to the bottom on new content — but ONLY if
  // the user was already near the bottom. Lets them scroll up to read older
  // history without the streaming dragging them back down on every token.
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = messagesContainerRef.current
    if (!c) return
    const distanceFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight
    if (distanceFromBottom < 32) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [recentMessages, isWaiting])

  return (
    <div
      className="hidden md:flex flex-col"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 380,
        height: 320,
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'var(--bg-elev)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        zIndex: 50,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.92)',
        transformOrigin: 'bottom right',
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/*
        Header is the primary keyboard-accessible expand affordance. Close X
        is a sibling (not nested) — both real <button>s with their own labels.
      */}
      <button
        type="button"
        onClick={onExpand}
        aria-label="Open chat"
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: '8px 12px',
          paddingRight: 36,
          borderBottom: '1px solid var(--line)',
          background: 'transparent',
          border: 0,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          className="font-serif truncate"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.2 }}
        >
          Chat
        </span>
        <span
          aria-hidden
          className={isConnected ? 'liminal-breathe' : undefined}
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: dotColor,
            boxShadow: isConnected ? `0 0 4px ${dotColor}` : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat dock"
        className="hover:opacity-70"
        style={{
          position: 'absolute',
          top: 6,
          right: 10,
          color: 'var(--ink-muted)',
          background: 'transparent',
          border: 0,
          padding: 4,
          cursor: 'pointer',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>

      {/*
        Mini-chat surface — full message content (multi-line wrap), scrollable.
        No truncation: the dock is a real chat surface, not a preview, so users
        can READ as well as type. For very long messages, the user scrolls
        within this container or expands to fullscreen via the header.

        The container is mouse-clickable to expand (convenience), but text
        selection inside still works since selection doesn't fire click on
        mouseup if a drag occurred.
      */}
      <div
        ref={messagesContainerRef}
        onClick={() => {
          // Don't expand if the user was selecting text — only on a clean click.
          if (window.getSelection()?.toString()) return
          onExpand()
        }}
        className="flex-1 flex flex-col gap-2 overflow-y-auto cursor-pointer"
        style={{ padding: '8px 12px', minHeight: 0 }}
      >
        {recentMessages.length === 0 && !isWaiting ? (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: 1 }}
          >
            --- --- ---
          </span>
        ) : (
          recentMessages.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-0.5 min-w-0"
              style={{ fontSize: 12, lineHeight: 1.5 }}
            >
              <span
                className="font-mono shrink-0"
                style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: 0.5 }}
              >
                {m.role === 'user' ? 'you' : m.role === 'assistant' ? 'daimon' : '·'}
              </span>
              <span
                className="font-serif min-w-0"
                style={{
                  color: 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content || '—'}
              </span>
            </div>
          ))
        )}
        {/*
          Thinking indicator — shown when a turn is in flight but the agent
          hasn't yet emitted a streaming assistant message (LLM "first token"
          latency, or between iterations during tool use). Without this the
          dock looks frozen during the 1-5s pre-stream phase and users wonder
          if their message even sent.
        */}
        {isWaiting &&
          (() => {
            const last = recentMessages[recentMessages.length - 1]
            const liveStream = last?.role === 'assistant' && last.isStreaming
            if (liveStream) return null
            return (
              <div
                className="flex flex-col gap-0.5 min-w-0"
                style={{ fontSize: 12, lineHeight: 1.5 }}
                aria-live="polite"
              >
                <span
                  className="font-mono shrink-0"
                  style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: 0.5 }}
                >
                  daimon
                </span>
                <span
                  className="font-mono liminal-breathe"
                  style={{ color: 'var(--ink-faint)', letterSpacing: 2 }}
                >
                  …
                </span>
              </div>
            )
          })()}
        <div ref={messagesEndRef} />
      </div>

      {/*
        Input area — sibling of the messages div, NOT nested under any expand
        handler. Submitting routes through onSend; clicking inside the form
        does not bubble up to the messages onClick because the form is a
        separate child of the root <div>.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSend()
        }}
        className="shrink-0 flex items-end gap-2"
        style={{
          padding: '8px 10px 10px',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isWaiting}
          placeholder="Reply…"
          rows={2}
          aria-label="Type a message"
          className="flex-1 font-serif resize-none focus:outline-none"
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--ink)',
            background: 'transparent',
            border: 0,
            padding: '4px 6px',
            minHeight: 36,
            maxHeight: 80,
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="shrink-0 disabled:cursor-not-allowed"
          style={{
            background: canSend ? 'var(--accent)' : 'var(--bg-elev)',
            color: canSend ? 'var(--bg-elev)' : 'var(--ink-faint)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            padding: '6px 8px',
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}

export const ChatDockView = memo(ChatDockViewImpl)
