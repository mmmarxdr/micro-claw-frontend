import { useState } from 'react'
import type { KnowledgeDoc, KnowledgeType } from '../../../design/memoryMocks'
import type { Density } from './MemoryCard'

interface KnowledgeCardProps {
  kn: KnowledgeDoc
  density: Density
}

export function KnowledgeCard({ kn, density }: KnowledgeCardProps) {
  const [hover, setHover] = useState(false)
  const isIndexing = kn.status === 'indexing'
  const padY = density === 'dense' ? 12 : density === 'sparse' ? 20 : 16
  const padX = density === 'dense' ? 14 : density === 'sparse' ? 22 : 18

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="font-sans relative overflow-hidden"
      style={{
        padding: `${padY}px ${padX}px`,
        background: 'var(--bg-elev)',
        border: `1px solid ${hover ? 'var(--line-strong)' : 'var(--line)'}`,
        borderRadius: 6,
      }}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <FileTypeGlyph type={kn.type} indexing={isIndexing} />
        <div className="flex-1 min-w-0">
          <div
            className="font-mono truncate"
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--ink)',
              marginBottom: 3,
            }}
          >
            {kn.title}
          </div>
          <div
            className="flex font-mono flex-wrap"
            style={{ fontSize: 11, color: 'var(--ink-muted)', gap: 8 }}
          >
            <span>{kn.originalName}</span>
            <span style={{ color: 'var(--ink-faint)' }}>·</span>
            <span>{kn.originalSize}</span>
            <span style={{ color: 'var(--ink-faint)' }}>·</span>
            <span>{kn.chunks} chunks</span>
          </div>
        </div>
        {isIndexing ? (
          <span
            className="inline-flex items-center font-serif italic rounded-full"
            style={{
              fontSize: 10,
              color: 'var(--amber)',
              background: 'color-mix(in srgb, var(--amber) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--amber) 27%, transparent)',
              padding: '2px 8px',
              gap: 6,
            }}
          >
            <span
              className="mem-breathe"
              style={{
                width: 5,
                height: 5,
                borderRadius: 99,
                background: 'var(--amber)',
              }}
            />
            indexing
          </span>
        ) : (
          <span
            className="inline-flex items-center font-serif italic rounded-full"
            style={{
              fontSize: 10,
              color: 'var(--green)',
              background: 'color-mix(in srgb, var(--green) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--green) 27%, transparent)',
              padding: '2px 8px',
            }}
          >
            ready
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 12.5,
          color: 'var(--ink-soft)',
          lineHeight: 1.55,
        }}
      >
        {kn.summary}
      </div>

      <div
        className="flex items-center font-mono"
        style={{
          marginTop: 12,
          gap: 10,
          fontSize: 10.5,
          color: 'var(--ink-muted)',
        }}
      >
        <span>ingested {kn.ingestedAt}</span>
        <span style={{ color: 'var(--ink-faint)' }}>·</span>
        <span>used {kn.lastUsed}</span>
        <span className="flex-1" />
        <span title="times injected into context" style={{ color: 'var(--accent)' }}>
          {kn.injections}× injected
        </span>
      </div>
    </div>
  )
}

interface FileTypeGlyphProps {
  type: KnowledgeType
  indexing: boolean
}

function FileTypeGlyph({ type, indexing }: FileTypeGlyphProps) {
  const label = type.toUpperCase()
  return (
    <div
      className="font-mono relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        width: 32,
        height: 40,
        flexShrink: 0,
        background: 'var(--bg-deep)',
        border: '1px solid var(--line)',
        borderRadius: 3,
        fontSize: 8,
        color: 'var(--accent)',
        fontWeight: 600,
        letterSpacing: 0.5,
      }}
      aria-hidden
    >
      {/* Folded page corner */}
      <span
        className="absolute"
        style={{
          top: 0,
          right: 0,
          width: 8,
          height: 8,
          borderLeft: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      />
      {indexing && (
        <span
          className="absolute mem-index"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: 'var(--amber)',
          }}
        />
      )}
      <span>{label}</span>
    </div>
  )
}
