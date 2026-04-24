import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Trash2, ChevronDown, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWebSocket, type WsStatus } from '../hooks/useWebSocket'
import { LiminalGlyph } from '../components/liminal/LiminalGlyph'
import { cn } from '../lib/utils'
import { uuid } from '../lib/uuid'

// ── Types ────────────────────────────────────────────────────────────────────

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogEntry {
  id: string
  time: string
  level: LogLevel
  msg: string
  [key: string]: unknown
}

interface StreamNotice {
  msg: string
  time: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']
const MAX_ENTRIES = 500

const levelTone: Record<LogLevel, string> = {
  DEBUG: 'var(--ink-muted)',
  INFO:  'var(--accent)',
  WARN:  'var(--amber)',
  ERROR: 'var(--red)',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    const hms = d.toLocaleTimeString('en-US', {
      hour12: false,
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return hms + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}

function extraFields(entry: LogEntry): string {
  return Object.entries(entry)
    .filter(([k]) => !['id', 'time', 'level', 'msg', 'event_type'].includes(k))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('  ')
}

// ── Liminal primitives ───────────────────────────────────────────────────────

const cardBaseStyle: CSSProperties = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 6,
}

function StatusDot({ status }: { status: WsStatus }) {
  const color =
    status === 'connected' ? 'var(--accent)' :
    status === 'connecting' ? 'var(--amber)' :
    status === 'error' ? 'var(--red)' :
    'var(--ink-faint)'
  const label =
    status === 'connected' ? 'streaming' :
    status === 'connecting' ? 'connecting' :
    status === 'error' ? 'error' :
    'disconnected'
  return (
    <span
      className="font-mono inline-flex items-center"
      style={{
        gap: 6,
        fontSize: 10.5,
        letterSpacing: 0.6,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: color,
          boxShadow: status === 'connected' ? `0 0 8px ${color}` : 'none',
        }}
      />
      {label}
    </span>
  )
}

function StreamUnavailableBanner({ notice }: { notice: StreamNotice }) {
  return (
    <div
      style={{
        ...cardBaseStyle,
        padding: '20px 22px',
        borderColor: 'color-mix(in srgb, var(--amber) 35%, var(--line))',
        background: 'color-mix(in srgb, var(--amber) 6%, var(--bg-elev))',
      }}
    >
      <div className="flex items-start" style={{ gap: 12 }}>
        <AlertTriangle size={16} style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div
            className="font-serif"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}
          >
            Live log stream is unavailable.
          </div>
          <div
            className="font-serif italic"
            style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}
          >
            {notice.msg}
          </div>
          <Link
            to="/settings"
            className="font-mono"
            style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'var(--accent)',
              textDecoration: 'none',
              borderBottom: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              paddingBottom: 1,
            }}
          >
            open settings →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [notice, setNotice] = useState<StreamNotice | null>(null)
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(LEVELS))
  const [autoScroll, setAutoScroll] = useState(true)
  const [newLineCount, setNewLineCount] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── WebSocket message handler
  const handleMessage = useCallback((data: unknown) => {
    const raw = data as {
      time?: string
      level?: string
      msg?: string
      event_type?: string
      [key: string]: unknown
    }
    if (!raw.time || !raw.level || !raw.msg) return

    // Backend sends a single frame with event_type=stream_unavailable when
    // the audit backend cannot stream. Surface it as a banner, not as a log line.
    if (raw.event_type === 'stream_unavailable') {
      setNotice({ msg: raw.msg, time: raw.time })
      return
    }

    const { time, level, msg, ...rest } = raw

    const entry: LogEntry = {
      id:   uuid(),
      time,
      level: level.toUpperCase() as LogLevel,
      msg,
      ...rest,
    }

    setEntries(prev => {
      const next = [...prev, entry]
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
    })
  }, [])

  const { status } = useWebSocket({ path: '/ws/logs', onMessage: handleMessage })

  // ── Auto-scroll + new-line tracking
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewLineCount(0)
    } else {
      setNewLineCount(n => n + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (atBottom) {
      setAutoScroll(true)
      setNewLineCount(0)
    }
  }

  const resumeScroll = () => {
    setAutoScroll(true)
    setNewLineCount(0)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Level toggle
  const toggleLevel = (level: LogLevel) => {
    setActiveLevels(prev => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next.size === 0 ? prev : next
    })
  }

  // ── Derived data
  const filteredEntries = useMemo(
    () => entries.filter(e => activeLevels.has(e.level)),
    [entries, activeLevels],
  )

  return (
    <div
      className="flex flex-col relative"
      style={{
        height: '100vh',
        padding: '28px 32px 0',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Preamble ── */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
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
              what I'm doing right now
            </span>
            <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>&nbsp;·&nbsp;</span>
            <span>live log stream</span>
          </h1>
        </div>
        <p
          className="font-serif italic"
          style={{
            fontSize: 14.5,
            color: 'var(--ink-soft)',
            maxWidth: 640,
            lineHeight: 1.55,
            marginLeft: 34,
            marginTop: 0,
          }}
        >
          every tool call, every model invocation — as it happens.
        </p>
      </div>

      {/* ── Notice (if streaming unavailable) ── */}
      {notice && (
        <div style={{ marginBottom: 14, flexShrink: 0 }}>
          <StreamUnavailableBanner notice={notice} />
        </div>
      )}

      {/* ── Filter bar ── */}
      <div
        className="flex items-center"
        style={{
          gap: 10,
          padding: '10px 14px',
          ...cardBaseStyle,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: 'none',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <div className="flex items-center" style={{ gap: 6, flex: 1, minWidth: 0 }}>
          {LEVELS.map(level => {
            const active = activeLevels.has(level)
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className="font-mono"
                style={{
                  fontSize: 10.5,
                  letterSpacing: 0.8,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: active
                    ? `color-mix(in srgb, ${levelTone[level]} 50%, var(--line))`
                    : 'var(--line)',
                  background: active
                    ? `color-mix(in srgb, ${levelTone[level]} 8%, transparent)`
                    : 'transparent',
                  color: active ? levelTone[level] : 'var(--ink-faint)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                {level}
              </button>
            )
          })}
          <span
            className="font-mono"
            style={{
              fontSize: 10.5,
              letterSpacing: 0.6,
              color: 'var(--ink-faint)',
              marginLeft: 8,
            }}
          >
            {filteredEntries.length} {filteredEntries.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center" style={{ gap: 14 }}>
          <StatusDot status={status} />
          <button
            onClick={() => (autoScroll ? setAutoScroll(false) : resumeScroll())}
            className="font-mono"
            style={controlButtonStyle}
          >
            {autoScroll ? 'pause' : 'resume'}
          </button>
          <button
            onClick={() => setEntries([])}
            className="font-mono inline-flex items-center"
            style={{ ...controlButtonStyle, gap: 5 }}
          >
            <Trash2 size={11} />
            clear
          </button>
        </div>
      </div>

      {/* ── Log output ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="font-mono relative"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderTop: 'none',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          fontSize: 11.5,
          lineHeight: 1.65,
          marginBottom: 28,
        }}
      >
        {filteredEntries.length === 0 ? (
          <div
            className="flex items-center justify-center font-serif italic"
            style={{
              height: '100%',
              minHeight: 200,
              fontSize: 13.5,
              color: 'var(--ink-faint)',
            }}
          >
            {notice ? 'no logs to show.' : 'waiting for the agent to do something…'}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const extra = extraFields(entry)
            return (
              <div
                key={entry.id}
                className="flex items-baseline"
                style={{
                  gap: 12,
                  padding: '2px 14px',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 4%, transparent)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{
                    color: 'var(--ink-faint)',
                    width: 96,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatTime(entry.time)}
                </span>
                <span
                  style={{
                    color: levelTone[entry.level],
                    width: 44,
                    flexShrink: 0,
                    fontWeight: 500,
                    letterSpacing: 0.4,
                  }}
                >
                  {entry.level}
                </span>
                <span style={{ color: 'var(--ink)', flex: 1, wordBreak: 'break-word' }}>
                  {entry.msg}
                </span>
                {extra && (
                  <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>
                    {extra}
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── New lines pill ── */}
      {!autoScroll && newLineCount > 0 && (
        <div
          className="absolute"
          style={{
            bottom: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}
        >
          <button
            onClick={resumeScroll}
            className={cn('flex items-center font-mono')}
            style={{
              gap: 6,
              background: 'var(--accent)',
              color: 'white',
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              padding: '6px 12px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent)',
            }}
          >
            <ChevronDown size={12} />
            {newLineCount} new {newLineCount === 1 ? 'line' : 'lines'}
          </button>
        </div>
      )}
    </div>
  )
}

const controlButtonStyle: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  background: 'transparent',
  border: '1px solid var(--line)',
  borderRadius: 4,
  padding: '4px 10px',
  cursor: 'pointer',
  transition: 'all 120ms ease',
}
