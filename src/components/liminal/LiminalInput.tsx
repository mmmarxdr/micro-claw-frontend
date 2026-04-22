import { useEffect, useRef } from 'react'
import { ENTER, MOD } from '../../lib/platform'
import { Kbd } from './Kbd'
import { LiminalPill } from './LiminalPill'

interface LiminalInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  /** When true the input is non-editable and the button is disabled. */
  disabled?: boolean
  /** Trigger from the keyboard shortcut indicator. */
  onSummon?: () => void
  /** Placeholder shown when value is empty. Default: "speak, and Daimon listens…" */
  placeholder?: string
  /** Optional pill-shaped buttons rendered in the toolbar (Attach, /tools, @mention). */
  onAttach?: () => void
  onToolsMenu?: () => void
  onMention?: () => void
  /** Auto-focus on mount. Default true. */
  autoFocus?: boolean
}

/**
 * Chat input — single-row textarea (auto-grows when typing), italic serif
 * placeholder, optional pill toolbar, "Invoke" submit button. Enter submits;
 * Shift+Enter inserts newline.
 */
export function LiminalInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  onSummon,
  placeholder = 'speak, and Daimon listens…',
  onAttach,
  onToolsMenu,
  onMention,
  autoFocus = true,
}: LiminalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldRefocusRef = useRef(false)
  const prevDisabledRef = useRef(disabled)
  const hasPills = !!(onAttach || onToolsMenu || onMention)

  // Auto-resize the textarea up to a cap.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  // When the input becomes disabled on submit (isWaiting=true), the browser
  // drops focus from the <textarea>. Re-focus once the turn finishes so the
  // user can keep typing without clicking back into the input.
  useEffect(() => {
    if (prevDisabledRef.current && !disabled && shouldRefocusRef.current) {
      shouldRefocusRef.current = false
      textareaRef.current?.focus()
    }
    prevDisabledRef.current = disabled
  }, [disabled])

  const submit = () => {
    shouldRefocusRef.current = true
    onSubmit()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) submit()
    }
  }

  return (
    <div style={{ padding: '10px 16px 12px', borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
      <div
        className="rounded-lg flex items-end gap-2"
        style={{
          border: '1px solid var(--line-strong)',
          background: 'var(--bg-elev)',
          padding: '6px 8px 6px 12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="liminal-input flex-1 resize-none bg-transparent outline-none text-ink font-sans"
          style={{
            lineHeight: 1.45,
            minHeight: 22,
            maxHeight: 180,
            padding: '4px 0',
          }}
        />
        {hasPills && (
          <div className="flex items-center gap-1.5 shrink-0" style={{ paddingBottom: 2 }}>
            {onAttach && <LiminalPill onClick={onAttach}>Attach</LiminalPill>}
            {onToolsMenu && <LiminalPill onClick={onToolsMenu}>/ tools</LiminalPill>}
            {onMention && <LiminalPill onClick={onMention}>@ mention</LiminalPill>}
          </div>
        )}
        {onSummon && (
          <button
            type="button"
            onClick={onSummon}
            className="cursor-pointer shrink-0"
            style={{ paddingBottom: 2 }}
            title="Command palette"
          >
            <Kbd>{MOD} K</Kbd>
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="font-sans flex items-center gap-1.5 rounded-[5px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          style={{
            background: 'var(--accent)',
            color: 'var(--bg-elev)',
            fontSize: 12, fontWeight: 600,
            padding: '5px 12px', border: 'none',
          }}
        >
          Invoke
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              background: 'rgba(255,255,255,0.2)',
              padding: '1px 5px', borderRadius: 3,
            }}
          >
            {ENTER}
          </span>
        </button>
      </div>
    </div>
  )
}
