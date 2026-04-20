import type { ReactNode } from 'react'

type ChipColor = 'muted' | 'teal' | 'amber' | 'red' | 'green'

interface LiminalChipProps {
  children: ReactNode
  /** Visual tone — defaults to neutral muted. */
  color?: ChipColor
  /** When true, fill with a soft tint of the color. Otherwise transparent w/ neutral border. */
  soft?: boolean
}

const COLOR_VAR: Record<ChipColor, string> = {
  muted: 'var(--ink-muted)',
  teal:  'var(--accent)',
  amber: 'var(--amber)',
  red:   'var(--red)',
  green: 'var(--green)',
}

export function LiminalChip({ children, color = 'muted', soft = false }: LiminalChipProps) {
  const c = COLOR_VAR[color]
  return (
    <span
      className="font-mono text-[10px] rounded-full px-1.5 py-px"
      style={{
        color: c,
        background: soft ? `color-mix(in srgb, ${c} 9%, transparent)` : 'transparent',
        border: soft
          ? `1px solid color-mix(in srgb, ${c} 19%, transparent)`
          : '1px solid var(--line)',
      }}
    >
      {children}
    </span>
  )
}
