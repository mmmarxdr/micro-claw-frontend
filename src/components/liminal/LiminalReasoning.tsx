import { useState } from 'react'

export interface LiminalReasoningProps {
  /** The reasoning text. Renders nothing if empty. */
  text?: string
  /** True while reasoning tokens are still arriving. */
  streaming?: boolean
  /** When the assistant has begun emitting visible text, the reasoning auto-collapses. */
  hasTextStarted?: boolean
  /** Optional duration label, e.g. "6s". When omitted while streaming, shows "pondering…". */
  duration?: string
  /** Force initial open state. Defaults to: open while streaming with no text yet. */
  defaultOpen?: boolean
}

export function LiminalReasoning({
  text,
  streaming = false,
  hasTextStarted = false,
  duration,
  defaultOpen,
}: LiminalReasoningProps) {
  // Auto-state: open while reasoning is live and no text has begun.
  const autoOpen = defaultOpen ?? (streaming && !hasTextStarted)
  // Once the user clicks, we honor their explicit choice.
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? autoOpen

  if (!text) return null

  const label = streaming
    ? 'pondering…'
    : duration
      ? `pondered for ${duration}`
      : 'pondered'

  return (
    <div className="my-1 mb-2.5">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        className="inline-flex items-center gap-2 cursor-pointer rounded-full font-sans text-ink-muted"
        style={{
          padding: '3px 10px 3px 8px',
          background: 'var(--bg-deep)',
          border: '1px solid var(--line)',
          fontSize: 11,
        }}
      >
        {streaming ? (
          <span
            className="liminal-breathe"
            style={{
              width: 7, height: 7, borderRadius: 99,
              background: 'var(--accent)',
            }}
          />
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.22-8.56" />
          </svg>
        )}
        <span className="font-serif italic">{label}</span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div
          className="font-sans text-ink-soft mt-1.5 whitespace-pre-wrap"
          style={{
            padding: '10px 14px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderLeft: '2px solid color-mix(in srgb, var(--accent) 40%, transparent)',
            borderRadius: 5,
            fontSize: 12,
            lineHeight: 1.65,
          }}
        >
          {text}
          {streaming && <span className="liminal-cursor" aria-hidden />}
        </div>
      )}
    </div>
  )
}
