import { useEffect } from 'react'
import { Kbd } from './Kbd'
import { MOD } from '../../lib/platform'

export interface CmdAction {
  glyph: string
  label: string
  shortcut?: string
  onSelect?: () => void
}

interface LiminalCmdProps {
  open: boolean
  onClose: () => void
  /** Override the default action list. */
  actions?: CmdAction[]
  /** Called when the user toggles the theme via the palette. */
  onToggleTheme?: () => void
}

const DEFAULT_ACTIONS: (extra: { onToggleTheme?: () => void }) => CmdAction[] = ({ onToggleTheme }) => [
  { glyph: '⫶', label: 'New thread',         shortcut: `${MOD} N` },
  { glyph: '⎇', label: 'Fork conversation',  shortcut: `${MOD} ⇧ F` },
  { glyph: '❋', label: 'Save to memory',     shortcut: `${MOD} M` },
  { glyph: '⚒', label: 'Run tool…',          shortcut: `${MOD} T` },
  { glyph: '☾', label: 'Toggle theme',       shortcut: `${MOD} .`, onSelect: onToggleTheme },
]

export function LiminalCmd({ open, onClose, actions, onToggleTheme }: LiminalCmdProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const list = actions ?? DEFAULT_ACTIONS({ onToggleTheme })

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{
        background: 'rgba(10,8,5,0.5)',
        paddingTop: 90,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-[10px] overflow-hidden"
        style={{
          width: 520,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line-strong)',
          boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 13%, transparent), 0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="font-serif italic"
            style={{ color: 'var(--accent)', fontSize: 14 }}
          >
            summon
          </span>
          <span
            className="font-serif italic flex-1 text-ink-muted"
            style={{ fontSize: 14 }}
          >
            a command, a tool, a memory…
          </span>
          <Kbd>esc</Kbd>
        </div>
        <div className="font-sans" style={{ padding: '6px 0' }}>
          <div
            className="font-mono uppercase text-ink-muted"
            style={{ padding: '4px 18px', fontSize: 10, letterSpacing: 0.8 }}
          >
            · actions
          </div>
          {list.map((it, i) => (
            <button
              key={`${it.label}-${i}`}
              type="button"
              onClick={() => {
                it.onSelect?.()
                onClose()
              }}
              className="w-full text-left flex items-center gap-3 cursor-pointer"
              style={{
                padding: '7px 18px',
                fontSize: 13, color: 'var(--ink)',
                background: i === 0 ? 'var(--accent-soft)' : 'transparent',
                borderLeft: i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                paddingLeft: i === 0 ? 16 : 18,
              }}
            >
              <span
                className="flex items-center justify-center rounded-[4px]"
                style={{
                  width: 22, height: 22,
                  background: 'var(--bg-deep)',
                  fontSize: 12,
                  color: i === 0 ? 'var(--accent)' : 'var(--ink-muted)',
                }}
              >
                {it.glyph}
              </span>
              <span className="flex-1">{it.label}</span>
              {it.shortcut && <Kbd>{it.shortcut}</Kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
