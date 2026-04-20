import { KNOWLEDGE } from '../../../design/memoryMocks'
import { KnowledgeCard } from './KnowledgeCard'
import type { Density } from './MemoryCard'

interface KnowledgeViewProps {
  density: Density
  editorial: boolean
}

export function KnowledgeView({ density, editorial }: KnowledgeViewProps) {
  const totalChunks = KNOWLEDGE.reduce((a, k) => a + k.chunks, 0)
  const totalInjections = KNOWLEDGE.reduce((a, k) => a + k.injections, 0)

  return (
    <>
      {editorial && (
        <div
          className="font-serif italic"
          style={{
            padding: '4px 0 20px',
            fontSize: 14,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          You have handed me{' '}
          <span style={{ color: 'var(--ink)' }}>{KNOWLEDGE.length} documents</span>
          . I've converted them to markdown, chunked them into{' '}
          <span style={{ color: 'var(--ink)' }}>{totalChunks} pieces</span>, and
          injected them into our conversations{' '}
          <span style={{ color: 'var(--accent)' }}>{totalInjections} times</span>.
        </div>
      )}

      {/* Drop zone */}
      <div
        className="flex items-center"
        style={{
          border: '2px dashed var(--line)',
          borderRadius: 6,
          padding: '20px 24px',
          marginBottom: 16,
          gap: 14,
          background: 'var(--bg-elev)',
        }}
      >
        <div
          className="flex items-center justify-center font-mono"
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontSize: 20,
          }}
          aria-hidden
        >
          +
        </div>
        <div className="flex-1">
          <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            Drop files here, or{' '}
            <span
              className="cursor-pointer underline"
              style={{ color: 'var(--accent)' }}
            >
              choose
            </span>
          </div>
          <div
            className="font-serif italic"
            style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}
          >
            I accept PDFs, Markdown, Word, HTML, and zip archives.
          </div>
        </div>
        <button
          type="button"
          className="font-sans cursor-pointer"
          style={{
            fontSize: 11.5,
            padding: '7px 14px',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 4,
            color: 'var(--ink-soft)',
          }}
        >
          Connect source…
        </button>
      </div>

      <div className="grid" style={{ gap: density === 'dense' ? 8 : 12 }}>
        {KNOWLEDGE.map((k) => (
          <KnowledgeCard key={k.id} kn={k} density={density} />
        ))}
      </div>
    </>
  )
}
