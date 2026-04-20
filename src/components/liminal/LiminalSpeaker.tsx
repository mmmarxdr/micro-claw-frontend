import type { ReactNode } from 'react'

interface LiminalSpeakerProps {
  /** Bold label shown in sans (e.g. "You", "Daimon"). */
  label: string
  /** Optional italic serif suffix (e.g. "speaks") rendered after the label. */
  italic?: string
  /** Right-aligned timestamp (mono). */
  time?: string
  /** Glyph that floats into the thread gutter (24×24 area). */
  glyph: ReactNode
  /** Color for the bold label — typically var(--ink) for users, var(--accent) for the agent. */
  color?: string
}

/** Speaker header — glyph sits in the -42px gutter ON the vertical thread line. */
export function LiminalSpeaker({ label, italic, time, glyph, color }: LiminalSpeakerProps) {
  return (
    <div className="relative mb-2.5">
      {/* Glyph — floats into the thread gutter; bg halo occludes the line behind it */}
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          left: -42,
          top: -1,
          width: 24,
          height: 24,
          background: 'var(--bg)',
          boxShadow: '0 0 0 4px var(--bg)',
        }}
      >
        {glyph}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span
          className="font-sans"
          style={{ fontSize: 12, fontWeight: 600, color: color ?? 'var(--ink)', letterSpacing: 0.1 }}
        >
          {label}
        </span>
        {italic && (
          <span
            className="font-serif italic text-ink-muted"
            style={{ fontSize: 12 }}
          >
            {italic}
          </span>
        )}
        <span className="flex-1 self-center" style={{ height: 1, background: 'var(--line)' }} />
        {time && (
          <span className="font-mono text-ink-faint" style={{ fontSize: 10.5 }}>
            {time}
          </span>
        )}
      </div>
    </div>
  )
}
