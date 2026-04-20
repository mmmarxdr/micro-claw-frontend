import { useMemo, useState } from 'react'
import type { ToolCall } from '../../types/chat'
import { LiminalChip } from './LiminalChip'
import { LiminalToolGlyph } from './LiminalToolGlyph'

interface LiminalToolProps {
  tool: ToolCall
  /** Optional callback — when set, the expanded view shows an "open in workspace →" button. */
  onOpen?: () => void
}

type ToolStatus = 'done' | 'running' | 'error'

function statusOf(tool: ToolCall): ToolStatus {
  if (!tool.done) return 'running'
  if (tool.isError) return 'error'
  return 'done'
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function buildPreview(input: string, maxLen = 60): string {
  try {
    const parsed = JSON.parse(input) as Record<string, unknown>
    const fav = (parsed.command ?? parsed.url ?? parsed.path ?? Object.values(parsed)[0]) as unknown
    if (typeof fav === 'string') {
      return fav.length > maxLen ? fav.slice(0, maxLen) + '…' : fav
    }
  } catch { /* not JSON — fall through */ }
  return input.length > maxLen ? input.slice(0, maxLen) + '…' : input
}

function deriveStats(output?: string): { lines?: number; matches?: number } {
  if (!output) return {}
  const lines = output.split('\n').length
  return { lines }
}

function formatJSON(input: string): string {
  try { return JSON.stringify(JSON.parse(input), null, 2) }
  catch { return input }
}

const STATUS_COLOR: Record<ToolStatus, string> = {
  done:    'var(--accent)',
  running: 'var(--amber)',
  error:   'var(--red)',
}

export function LiminalTool({ tool, onOpen }: LiminalToolProps) {
  const [expanded, setExpanded] = useState(false)
  const status = statusOf(tool)
  const isRunning = status === 'running'
  const isError = status === 'error'
  const statusColor = STATUS_COLOR[status]

  const preview = useMemo(() => buildPreview(tool.input), [tool.input])
  const stats = useMemo(() => deriveStats(tool.output), [tool.output])
  const duration = formatDuration(tool.duration_ms)

  return (
    <div className="flex my-1.5">
      {/* Status rail */}
      <div
        className={isRunning ? 'liminal-breathe' : undefined}
        style={{
          width: 2, background: statusColor, borderRadius: 99,
          marginRight: 12, opacity: isRunning ? 1 : 0.55,
          alignSelf: 'stretch',
        }}
      />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => tool.done && setExpanded((e) => !e)}
          className="flex items-center gap-2.5 w-full text-left font-mono"
          style={{ padding: '3px 0', fontSize: 12, cursor: tool.done ? 'pointer' : 'default' }}
          disabled={!tool.done}
        >
          <LiminalToolGlyph name={tool.name} color={statusColor} />
          <span className="text-ink font-medium">{tool.name}</span>
          <span
            className="text-ink-muted truncate min-w-0 flex-1"
            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {preview}
          </span>
          {isError && (
            <LiminalChip color="red" soft>failed</LiminalChip>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: 'var(--amber)' }}>
              <span
                className="liminal-breathe"
                style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--amber)' }}
              />
              running
            </span>
          )}
          {stats.lines != null && tool.done && (
            <LiminalChip color="muted">{stats.lines} lines</LiminalChip>
          )}
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', minWidth: 38, textAlign: 'right' }}>
            {duration}
          </span>
          {tool.done && (
            <span style={{ fontSize: 10, color: 'var(--ink-muted)', width: 10 }}>
              {expanded ? '▼' : '▸'}
            </span>
          )}
        </button>
        {expanded && tool.done && (
          <div
            className="font-mono mt-1.5 rounded-[5px]"
            style={{
              padding: 10,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              fontSize: 11,
            }}
          >
            <div
              className="grid"
              style={{ gridTemplateColumns: '70px 1fr', gap: '4px 12px', marginBottom: tool.output ? 10 : 0 }}
            >
              <span
                className="text-ink-muted uppercase"
                style={{ fontSize: 10, letterSpacing: 0.5, paddingTop: 2 }}
              >
                input
              </span>
              <pre
                className="text-ink-soft"
                style={{
                  margin: 0, whiteSpace: 'pre-wrap',
                  background: 'var(--bg-deep)', padding: 8, borderRadius: 3,
                  fontSize: 10.5,
                }}
              >
                {formatJSON(tool.input)}
              </pre>
            </div>
            {tool.output && (
              <div className="grid" style={{ gridTemplateColumns: '70px 1fr', gap: '4px 12px' }}>
                <span
                  className="text-ink-muted uppercase"
                  style={{ fontSize: 10, letterSpacing: 0.5, paddingTop: 2 }}
                >
                  output
                </span>
                <div>
                  <pre
                    style={{
                      margin: 0, whiteSpace: 'pre-wrap',
                      color: isError ? 'var(--red)' : 'var(--ink-soft)',
                      background: isError
                        ? 'color-mix(in srgb, var(--red) 5%, transparent)'
                        : 'var(--bg-deep)',
                      border: isError
                        ? '1px solid color-mix(in srgb, var(--red) 20%, transparent)'
                        : 'none',
                      padding: 8, borderRadius: 3, fontSize: 10.5,
                      maxHeight: 180, overflow: 'auto',
                    }}
                  >
                    {tool.output}
                  </pre>
                  {onOpen && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpen() }}
                      className="font-mono mt-1.5 rounded-[3px]"
                      style={{
                        fontSize: 10.5, color: 'var(--accent)',
                        background: 'var(--accent-soft)',
                        border: '1px solid color-mix(in srgb, var(--accent) 27%, transparent)',
                        padding: '3px 8px', cursor: 'pointer',
                      }}
                    >
                      open in workspace →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
