import type { Confidence } from '../../../design/memoryMocks'

// Each confidence level carries three redundant signals — colour, glyph
// (filled dots), and italic serif label — so the trust surface is
// impossible to miss even for colour-blind readers.
export interface ConfidenceMeta {
  label: string
  italic: string
  dots: number
  colorVar: string
}

export const CONFIDENCE_META: Record<Confidence, ConfidenceMeta> = {
  certain:  { label: 'certain',  italic: 'I know',   dots: 3, colorVar: 'var(--accent)' },
  inferred: { label: 'inferred', italic: 'I infer',  dots: 2, colorVar: 'var(--amber)' },
  assumed:  { label: 'assumed',  italic: 'I assume', dots: 1, colorVar: 'var(--ink-muted)' },
}

interface ConfidenceGlyphProps {
  conf: Confidence
  size?: number
}

export function ConfidenceGlyph({ conf, size = 10 }: ConfidenceGlyphProps) {
  const meta = CONFIDENCE_META[conf]
  return (
    <span className="inline-flex items-center" style={{ gap: 2 }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 99,
            background: i < meta.dots ? meta.colorVar : 'transparent',
            border: i < meta.dots ? 'none' : '1px solid var(--line)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </span>
  )
}

interface ConfidencePillProps {
  conf: Confidence
  showIcon?: boolean
}

export function ConfidencePill({ conf, showIcon = true }: ConfidencePillProps) {
  const meta = CONFIDENCE_META[conf]
  return (
    <span
      className="inline-flex items-center font-sans rounded-full"
      style={{
        gap: 6,
        fontSize: 10.5,
        color: meta.colorVar,
        background: `color-mix(in srgb, ${meta.colorVar} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${meta.colorVar} 20%, transparent)`,
        padding: '2px 8px 2px 6px',
        letterSpacing: 0.2,
      }}
    >
      {showIcon && <ConfidenceGlyph conf={conf} size={4.5} />}
      <span className="font-serif italic">{meta.italic}</span>
    </span>
  )
}
