import { LiminalGlyph } from './LiminalGlyph'

interface LiminalMarkProps {
  size?: number
  animate?: boolean
  showLabel?: boolean
}

/** Wordmark: glyph + "Daimon" in Fraunces. */
export function LiminalMark({ size = 20, animate = true, showLabel = true }: LiminalMarkProps) {
  if (!showLabel) return <LiminalGlyph size={size} animate={animate} />
  return (
    <div className="flex items-center gap-2.5">
      <LiminalGlyph size={size} animate={animate} />
      <span
        className="font-serif text-ink font-medium"
        style={{ fontSize: size * 0.82, letterSpacing: -0.2 }}
      >
        Daimon
      </span>
    </div>
  )
}
