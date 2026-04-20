import { useState, type CSSProperties } from 'react'
import type { Memory } from '../../../design/memoryMocks'
import { CONFIDENCE_META, ConfidencePill } from './confidence'

export type Density = 'sparse' | 'normal' | 'dense'

interface MemoryCardProps {
  mem: Memory
  density: Density
  showTrust: boolean
}

type Status = 'live' | 'editing' | 'quarantine'

export function MemoryCard({ mem, density, showTrust }: MemoryCardProps) {
  const [hover, setHover] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState<Status>('live')
  const isNote = mem.kind === 'note'

  const padY = density === 'dense' ? 10 : density === 'sparse' ? 20 : 14
  const padX = density === 'dense' ? 14 : density === 'sparse' ? 22 : 18

  const accentVar = CONFIDENCE_META[mem.confidence].colorVar
  const isQuarantined = status === 'quarantine'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setMenuOpen(false)
      }}
      className="font-sans relative"
      style={{
        padding: `${padY}px ${padX}px`,
        background: isQuarantined
          ? 'color-mix(in srgb, var(--red) 4%, transparent)'
          : 'var(--bg-elev)',
        border: `1px solid ${
          isQuarantined
            ? 'color-mix(in srgb, var(--red) 27%, transparent)'
            : hover
              ? 'var(--line-strong)'
              : 'var(--line)'
        }`,
        borderRadius: 6,
        borderLeft: `2px solid ${isQuarantined ? 'var(--red)' : accentVar}`,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header row: kind indicator, cluster, trust pill, menu */}
      <div
        className="flex items-center"
        style={{ gap: 8, marginBottom: 8, fontSize: 10.5, color: 'var(--ink-muted)' }}
      >
        <span
          className="font-mono uppercase"
          style={{
            letterSpacing: 0.7,
            color: isNote ? 'var(--accent)' : 'var(--ink-muted)',
            fontWeight: isNote ? 600 : 400,
          }}
        >
          {isNote ? 'note' : 'fact'}
        </span>
        <span style={{ color: 'var(--ink-faint)' }}>·</span>
        <span style={{ color: 'var(--ink-soft)' }}>{mem.cluster}</span>
        <span className="flex-1" />
        {showTrust && <ConfidencePill conf={mem.confidence} />}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            aria-label="Card actions"
            onClick={() => setMenuOpen((m) => !m)}
            className="cursor-pointer"
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: menuOpen ? 'var(--bg-deep)' : 'transparent',
              border: `1px solid ${menuOpen ? 'var(--line)' : 'transparent'}`,
              color: 'var(--ink-muted)',
              fontSize: 14,
              lineHeight: 1,
              opacity: hover || menuOpen ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <MemoryMenu
              onEdit={() => {
                setStatus('editing')
                setMenuOpen(false)
              }}
              onQuarantine={() => {
                setStatus('quarantine')
                setMenuOpen(false)
              }}
            />
          )}
        </div>
      </div>

      {/* Body */}
      {status === 'editing' ? (
        <div>
          <div
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: isNote ? 13 : 13.5,
              lineHeight: 1.6,
              color: 'var(--ink)',
              outline: 'none',
              padding: '6px 8px',
              margin: '-6px -8px',
              borderRadius: 4,
              background: 'var(--bg-deep)',
              border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
          >
            {mem.content}
          </div>
          <div className="flex" style={{ gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => setStatus('live')} style={editBtnStyle(true)}>
              Save
            </button>
            <button type="button" onClick={() => setStatus('live')} style={editBtnStyle(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="font-sans"
          style={{
            fontSize: isNote ? 13 : 13.5,
            lineHeight: 1.6,
            color: 'var(--ink)',
            textDecoration: isQuarantined ? 'line-through' : 'none',
            opacity: isQuarantined ? 0.55 : 1,
          }}
        >
          {mem.content}
        </div>
      )}

      {/* Footer: tags, source, last-seen */}
      <div
        className="flex items-center font-mono flex-wrap"
        style={{
          gap: 6,
          marginTop: 10,
          fontSize: 10.5,
          color: 'var(--ink-muted)',
        }}
      >
        {mem.tags.map((t) => (
          <span
            key={t}
            className="rounded-full"
            style={{
              padding: '1px 7px',
              border: '1px solid var(--line)',
              color: 'var(--ink-soft)',
              fontSize: 10,
            }}
          >
            #{t}
          </span>
        ))}
        <span className="flex-1" />
        {showTrust && (
          <>
            <SourceRef source={mem.source} />
            <span style={{ color: 'var(--ink-faint)' }}>·</span>
            <span title={`Confirmed ${mem.confirmedCount}×`}>seen {mem.lastSeen}</span>
          </>
        )}
      </div>

      {isQuarantined && (
        <div
          className="flex items-center font-serif italic"
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px dashed color-mix(in srgb, var(--red) 27%, transparent)',
            fontSize: 11,
            color: 'var(--red)',
            gap: 8,
          }}
        >
          <span>
            I'll forget this.{' '}
            <span className="font-sans not-italic" style={{ color: 'var(--ink-muted)' }}>
              Next time it comes up, I'll ask.
            </span>
          </span>
          <span className="flex-1" />
          <button type="button" onClick={() => setStatus('live')} style={editBtnStyle(false)}>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

interface MemoryMenuProps {
  onEdit: () => void
  onQuarantine: () => void
}

function MemoryMenu({ onEdit, onQuarantine }: MemoryMenuProps) {
  const items: Array<
    | { divider: true }
    | { label: string; detail: string; onClick?: () => void; danger?: boolean }
  > = [
    { label: 'Edit', detail: 'correct the wording', onClick: onEdit },
    { label: 'Pin', detail: 'surface this often' },
    { label: 'Trace origin', detail: 'open source conversation' },
    { divider: true },
    {
      label: "That's not right",
      detail: 'mark for forgetting',
      onClick: onQuarantine,
      danger: true,
    },
  ]
  return (
    <div
      className="font-sans absolute"
      style={{
        right: 0,
        top: 26,
        zIndex: 10,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line-strong)',
        borderRadius: 6,
        padding: 4,
        minWidth: 180,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        fontSize: 12,
      }}
    >
      {items.map((it, i) =>
        'divider' in it ? (
          <div
            key={`div-${i}`}
            style={{ height: 1, background: 'var(--line)', margin: '4px 2px' }}
          />
        ) : (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className="cursor-pointer text-left w-full block"
            style={{
              padding: '7px 10px',
              borderRadius: 4,
              background: 'transparent',
              border: 'none',
              color: it.danger ? 'var(--red)' : 'var(--ink)',
            }}
          >
            <div style={{ fontWeight: 500 }}>{it.label}</div>
            <div
              className="font-serif italic"
              style={{
                fontSize: 10.5,
                color: it.danger
                  ? 'color-mix(in srgb, var(--red) 80%, transparent)'
                  : 'var(--ink-muted)',
                marginTop: 1,
              }}
            >
              {it.detail}
            </div>
          </button>
        ),
      )}
    </div>
  )
}

interface SourceRefProps {
  source: Memory['source']
}

function SourceRef({ source }: SourceRefProps) {
  return (
    <span
      className="inline-flex items-center cursor-pointer"
      style={{ gap: 4, color: 'var(--ink-muted)', fontSize: 10.5 }}
      title={`From "${source.conv}" on ${source.date}`}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </svg>
      <span
        className="truncate"
        style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {source.conv}
      </span>
    </span>
  )
}

function editBtnStyle(primary: boolean): CSSProperties {
  return {
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 4,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    background: primary ? 'var(--accent)' : 'transparent',
    color: primary ? 'var(--bg-elev)' : 'var(--ink-soft)',
    border: primary ? 'none' : '1px solid var(--line)',
  }
}
