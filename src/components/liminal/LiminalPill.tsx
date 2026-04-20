import type { ReactNode } from 'react'

interface LiminalPillProps {
  children: ReactNode
  onClick?: () => void
  /** Disabled state — non-interactive, lower contrast. */
  disabled?: boolean
}

/** Outlined pill button used in the input bar (Attach / / tools / @ mention). */
export function LiminalPill({ children, onClick, disabled }: LiminalPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-sans flex items-center gap-1 cursor-pointer rounded-full"
      style={{
        background: 'transparent',
        border: '1px solid var(--line)',
        color: 'var(--ink-soft)',
        fontSize: 11,
        padding: '3px 9px',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
