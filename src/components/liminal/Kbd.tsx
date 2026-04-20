import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] text-ink-muted bg-paper-deep border border-line rounded-[3px] px-1.5 py-px tracking-[0.3px]">
      {children}
    </span>
  )
}
