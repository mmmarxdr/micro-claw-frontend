import { memo, useEffect, useState, type KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'
import type { ChatMessage } from '../../types/chat'

const TRUNCATE_LEN = 60

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

function truncate(text: string, max = TRUNCATE_LEN): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= max) return collapsed
  return collapsed.slice(0, Math.max(0, max - 1)) + '…'
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
        Messages preview is mouse-clickable to expand (convenience, no role)
        — keyboard users have the header button. Scrolls if the last 3
        messages overflow the available space.
      */}
      <div
        onClick={onExpand}
        className="flex-1 flex flex-col gap-1.5 overflow-y-auto cursor-pointer"
        style={{ padding: '8px 12px', minHeight: 0 }}
      >
        {recentMessages.length === 0 ? (
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
              className="flex gap-1.5 min-w-0"
              style={{ fontSize: 11, lineHeight: 1.45 }}
            >
              <span className="font-mono shrink-0" style={{ color: 'var(--ink-muted)' }}>
                {m.role === 'user' ? 'you' : m.role === 'assistant' ? 'daimon' : '·'}
              </span>
              <span className="font-serif truncate min-w-0" style={{ color: 'var(--ink)' }}>
                {truncate(m.content || '—')}
              </span>
            </div>
          ))
        )}
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
