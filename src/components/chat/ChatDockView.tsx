import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ChatMessage } from '../../types/chat'

const MAX_MESSAGES = 3
const TRUNCATE_LEN = 60

interface ChatDockViewProps {
  messages: ChatMessage[]
  status: string
  onExpand: () => void
  onClose: () => void
}

function truncate(text: string, max = TRUNCATE_LEN): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= max) return collapsed
  return collapsed.slice(0, Math.max(0, max - 1)) + '…'
}

export function ChatDockView({ messages, status, onExpand, onClose }: ChatDockViewProps) {
  // Mount-time fade+scale, no keyframe in global CSS.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const recent = messages.slice(-MAX_MESSAGES)
  const isConnected = status === 'connected'
  const dotColor = isConnected ? 'var(--accent)' : 'var(--ink-muted)'

  return (
    <div
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpand()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Open chat"
      className="hidden md:flex flex-col cursor-pointer"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 320,
        maxHeight: 220,
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'var(--bg-elev)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        zIndex: 40,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.92)',
        transformOrigin: 'bottom right',
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
      }}
    >
      <div
        className="flex items-center justify-between gap-2 shrink-0"
        style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
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
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Close chat dock"
          className="hover:opacity-70"
          style={{ color: 'var(--ink-muted)', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        className="flex flex-col gap-1.5 overflow-hidden"
        style={{ padding: '8px 12px 10px' }}
      >
        {recent.length === 0 ? (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: 1 }}
          >
            --- --- ---
          </span>
        ) : (
          recent.map((m) => (
            <div
              key={m.id}
              className="flex gap-1.5 min-w-0"
              style={{ fontSize: 11, lineHeight: 1.45 }}
            >
              <span
                className="font-mono shrink-0"
                style={{ color: 'var(--ink-muted)' }}
              >
                {m.role === 'user' ? 'you' : m.role === 'assistant' ? 'daimon' : '·'}
              </span>
              <span
                className="font-serif truncate min-w-0"
                style={{ color: 'var(--ink)' }}
              >
                {truncate(m.content || '—')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
