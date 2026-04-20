import type { ReactNode } from 'react'

interface LiminalThreadProps {
  children: ReactNode
  /** Optional maximum width (px). Default: no cap — thread fills the chat area. */
  maxWidth?: number
}

/**
 * Conversation thread container — single vertical teal line runs the height,
 * with a soft fade at top and bottom so it feels liminal, not mechanical.
 * Children should be `LiminalUserMsg` / `LiminalAssistantMsg` rows.
 */
export function LiminalThread({ children, maxWidth }: LiminalThreadProps) {
  return (
    <div
      className="relative"
      style={{
        // 88px left = 40px (thread offset) + 48px (gutter for glyphs)
        padding: '8px 40px 8px 88px',
        maxWidth,
      }}
    >
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: 46,
          top: 0,
          bottom: 0,
          width: 1,
          background:
            'linear-gradient(to bottom, transparent 0, color-mix(in srgb, var(--accent) 40%, transparent) 24px, color-mix(in srgb, var(--accent) 20%, transparent) 40%, var(--line) 70%, transparent 100%)',
        }}
      />
      {children}
    </div>
  )
}
