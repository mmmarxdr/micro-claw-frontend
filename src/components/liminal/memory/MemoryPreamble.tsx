import { LiminalGlyph } from '../LiminalGlyph'
import type { MemoryCounts } from './MemoryToolbar'

interface MemoryPreambleProps {
  counts: MemoryCounts
}

export function MemoryPreamble({ counts }: MemoryPreambleProps) {
  return (
    <div
      style={{
        padding: '24px 48px 18px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-baseline" style={{ gap: 14, marginBottom: 6 }}>
        <LiminalGlyph size={20} animate />
        <h1
          className="font-serif"
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: -0.6,
          }}
        >
          <span className="italic" style={{ color: 'var(--accent)', fontWeight: 400 }}>
            what I remember
          </span>
          <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>
            &nbsp;·&nbsp;
          </span>
          <span>of you</span>
        </h1>
      </div>
      <div
        className="font-serif italic"
        style={{
          fontSize: 14.5,
          color: 'var(--ink-soft)',
          maxWidth: 640,
          lineHeight: 1.55,
          marginLeft: 34,
        }}
      >
        {counts.total} things live in me:{' '}
        <span style={{ color: 'var(--accent)' }}>{counts.certain} I know</span>,{' '}
        <span style={{ color: 'var(--amber)' }}>
          {counts.inferred} I infer from patterns
        </span>
        , and{' '}
        <span style={{ color: 'var(--ink-muted)' }}>
          {counts.assumed} I merely assume
        </span>
        . Correct me where I'm wrong — I'll forget what you ask me to forget.
      </div>
    </div>
  )
}

interface MemoryEmptyProps {
  query: string
}

export function MemoryEmpty({ query }: MemoryEmptyProps) {
  return (
    <div
      className="flex flex-col items-center"
      style={{ padding: 60, textAlign: 'center', gap: 14 }}
    >
      <LiminalGlyph size={36} animate={false} />
      <div
        className="font-serif italic"
        style={{ fontSize: 17, color: 'var(--ink-muted)' }}
      >
        {query
          ? 'nothing I remember matches that.'
          : "nothing here yet — we've only just met."}
      </div>
    </div>
  )
}
