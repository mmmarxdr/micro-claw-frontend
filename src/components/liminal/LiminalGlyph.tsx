interface LiminalGlyphProps {
  size?: number
  animate?: boolean
}

/** Daimon wordmark glyph: dot (thought) + bar (presence). Dot breathes when idle. */
export function LiminalGlyph({ size = 16, animate = true }: LiminalGlyphProps) {
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className={animate ? 'liminal-breathe' : undefined}
        style={{
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: 99,
          background: 'var(--accent)',
          position: 'absolute',
          top: size * 0.08,
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: `0 0 ${size * 0.4}px var(--accent)`,
        }}
      />
      <div
        style={{
          width: size * 0.14,
          height: size * 0.58,
          borderRadius: size * 0.07,
          background: 'var(--ink)',
          position: 'absolute',
          top: size * 0.38,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  )
}
