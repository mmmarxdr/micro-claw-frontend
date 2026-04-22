import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, AlertTriangle, X, Trash2, FileText, Image, File, FolderOpen } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { LiminalThread } from '../components/liminal/LiminalThread'
import { LiminalUserMsg } from '../components/liminal/LiminalUserMsg'
import { LiminalAssistantMsg } from '../components/liminal/LiminalAssistantMsg'
import { LiminalInput } from '../components/liminal/LiminalInput'
import { LiminalContinuePill, type PauseReason } from '../components/liminal/LiminalContinuePill'
import { LiminalReasoning } from '../components/liminal/LiminalReasoning'
import { LiminalGlyph } from '../components/liminal/LiminalGlyph'
import { LiminalSpeaker } from '../components/liminal/LiminalSpeaker'
import { groupTurns } from '../lib/turnGrouping'
import { uuid } from '../lib/uuid'
import { api } from '../api/client'
import type { Attachment, ChatMessage, MediaMeta, TurnStatus } from '../types/chat'

// ─────────────────────────────────────────────────────────────────
// Connection pill — Liminal-styled status indicator
// ─────────────────────────────────────────────────────────────────
function ConnectionPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: 'teal' | 'amber' | 'red' | 'muted' }> = {
    connected:    { label: 'listening',    tone: 'teal' },
    connecting:   { label: 'connecting…',  tone: 'amber' },
    disconnected: { label: 'disconnected', tone: 'muted' },
    error:        { label: 'error',        tone: 'red' },
  }
  const s = map[status] ?? map.disconnected
  const color =
    s.tone === 'teal' ? 'var(--accent)'
    : s.tone === 'amber' ? 'var(--amber)'
    : s.tone === 'red' ? 'var(--red)'
    : 'var(--ink-muted)'

  return (
    <span
      className="font-mono flex items-center gap-1.5 rounded-full"
      style={{
        fontSize: 10.5, color,
        padding: '3px 9px',
        border: `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
        background: `color-mix(in srgb, ${color} 9%, transparent)`,
      }}
    >
      <span
        className={s.tone === 'teal' || s.tone === 'amber' ? 'liminal-breathe' : undefined}
        style={{
          width: 5, height: 5, borderRadius: 99,
          background: color, boxShadow: `0 0 4px ${color}`,
        }}
      />
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// Live status — between thread and input (elapsed + activity + tokens)
// ─────────────────────────────────────────────────────────────────
interface LoopWarning {
  toolName: string
  repetitions: number
}

function LiveStatus({
  turnStatus,
  loopWarning,
}: {
  turnStatus: TurnStatus | null
  loopWarning: LoopWarning | null
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!turnStatus?.active) return
    const id = window.setInterval(() => {
      setElapsed(Date.now() - turnStatus.startTime)
    }, 100)
    return () => window.clearInterval(id)
  }, [turnStatus?.active, turnStatus?.startTime])

  // Show the bar when EITHER a turn is active/visible OR a loop warning is
  // in flight (so a heads-up outlives the tool it fired on).
  if (!turnStatus && !loopWarning) return null
  const seconds = turnStatus ? (elapsed > 0 ? elapsed : turnStatus.elapsedMs) / 1000 : 0

  return (
    <div
      className="font-mono flex items-center justify-between gap-3 shrink-0"
      style={{
        padding: '6px 16px',
        borderTop: '1px solid var(--line)',
        background: 'var(--bg-deep)',
        fontSize: 11,
        color: 'var(--ink-muted)',
        opacity: turnStatus?.active || loopWarning ? 1 : 0.6,
      }}
    >
      <div className="flex items-center gap-2.5">
        {turnStatus?.active && (
          <span
            className="liminal-breathe"
            style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent)' }}
          />
        )}
        {turnStatus && (
          <>
            <span style={{ color: 'var(--ink-soft)' }}>{seconds.toFixed(1)}s</span>
            <span>{turnStatus.activity}</span>
          </>
        )}
        {loopWarning && (
          <span
            className="inline-flex items-center rounded-[3px] font-serif italic"
            style={{
              gap: 5,
              fontSize: 10.5,
              color: 'var(--amber)',
              background: 'color-mix(in srgb, var(--amber) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
              padding: '1px 7px',
              marginLeft: turnStatus ? 6 : 0,
            }}
            title={`Same tool + same input called ${loopWarning.repetitions} times in a row`}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: 99,
                background: 'var(--amber)',
              }}
            />
            looping: <span className="not-italic font-mono">{loopWarning.toolName}</span>{' '}
            ({loopWarning.repetitions}×)
          </span>
        )}
      </div>
      {turnStatus && (
        <div className="flex items-center gap-2.5">
          <span>{turnStatus.inputTokens} in / {turnStatus.outputTokens} out</span>
          {turnStatus.iteration > 1 && (
            <span
              className="rounded-[3px]"
              style={{
                fontSize: 10,
                color: 'var(--ink-muted)',
                border: '1px solid var(--line)',
                padding: '1px 5px',
              }}
            >
              iter {turnStatus.iteration}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// File icon by MIME
// ─────────────────────────────────────────────────────────────────
function FileIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith('image/')) return <Image className={className} />
  if (mime.startsWith('text/'))  return <FileText className={className} />
  return <File className={className} />
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─────────────────────────────────────────────────────────────────
// Attachment chips (above input) + inside user message
// ─────────────────────────────────────────────────────────────────
function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[4px]"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        padding: '3px 8px',
        fontSize: 11,
        color: 'var(--ink-soft)',
      }}
    >
      <FileIcon mime={att.mime} className="w-3 h-3" />
      <span className="truncate max-w-[140px]">{att.filename}</span>
      <span style={{ color: 'var(--ink-muted)' }}>{formatSize(att.size)}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-red transition-colors"
          style={{ color: 'var(--ink-muted)' }}
          aria-label={`Remove ${att.filename}`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// Files drawer — Liminal-styled
// ─────────────────────────────────────────────────────────────────
function FilesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [files, setFiles] = useState<MediaMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.listMedia()
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [open])

  const handleDelete = async (sha256: string) => {
    setDeleting(sha256)
    try {
      await api.deleteMedia(sha256)
      setFiles((prev) => prev.filter((f) => f.sha256 !== sha256))
    } catch {
      // silent — file might already be gone
    } finally {
      setDeleting(null)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col"
        style={{ background: 'var(--bg-elev)', borderLeft: '1px solid var(--line)' }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
        >
          <h2 className="font-serif text-ink" style={{ fontSize: 15, fontWeight: 500 }}>
            Uploaded files
          </h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span
                className="rounded-full animate-spin"
                style={{
                  width: 20, height: 20,
                  border: '2px solid var(--line)',
                  borderTopColor: 'var(--accent)',
                }}
              />
            </div>
          )}
          {!loading && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <FolderOpen size={24} className="text-ink-muted mb-2" />
              <p className="font-mono text-ink-muted" style={{ fontSize: 11 }}>
                no files uploaded yet.
              </p>
            </div>
          )}
          {!loading && files.map((f) => (
            <div
              key={f.sha256}
              className="flex items-center gap-3"
              style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}
            >
              <FileIcon mime={f.mime} className="w-4 h-4 text-ink-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-ink truncate" style={{ fontSize: 11 }}>
                  {f.sha256.slice(0, 12)}…
                </p>
                <p style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                  {f.mime} · {formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(f.sha256)}
                disabled={deleting === f.sha256}
                className="text-ink-muted hover:text-red disabled:opacity-50"
              >
                {deleting === f.sha256
                  ? <span
                      className="rounded-full animate-spin inline-block"
                      style={{
                        width: 14, height: 14,
                        border: '2px solid var(--line)',
                        borderTopColor: 'var(--red)',
                      }}
                    />
                  : <Trash2 size={14} />
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [turnStatus, setTurnStatus] = useState<TurnStatus | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false)
  // Non-null when the last turn paused on a safety valve (iteration cap or
  // token budget) and is awaiting a resume choice from the user.
  // Volatile — not persisted across reloads.
  const [pendingContinuation, setPendingContinuation] = useState<PauseReason | null>(null)
  // Non-null when the backend detected the same tool + input called
  // repeatedly in a row. A passive heads-up in the LiveStatus bar; cleared
  // on turn_end. Non-blocking.
  const [loopWarning, setLoopWarning] = useState<LoopWarning | null>(null)

  // Live reasoning buffer for the in-flight turn (shown at the bottom until baked into a message).
  const reasoningRef = useRef('')
  const thinkingStartedAtRef = useRef<Date | undefined>(undefined)
  const turnHasMessageRef = useRef(false)
  const [liveReasoning, setLiveReasoning] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetTurnReasoning = useCallback(() => {
    reasoningRef.current = ''
    thinkingStartedAtRef.current = undefined
    turnHasMessageRef.current = false
    setLiveReasoning('')
  }, [])

  /** Bake the buffered reasoning into the FIRST non-user message of the current turn. */
  const bakeReasoningIfFirst = useCallback((msg: ChatMessage): ChatMessage => {
    if (turnHasMessageRef.current) return msg
    turnHasMessageRef.current = true
    if (!reasoningRef.current) return msg
    const baked: ChatMessage = {
      ...msg,
      reasoning: reasoningRef.current,
      reasoningStartedAt: thinkingStartedAtRef.current,
      reasoningEndedAt: new Date(),
    }
    reasoningRef.current = ''
    thinkingStartedAtRef.current = undefined
    setLiveReasoning('')
    return baked
  }, [])

  // ── WebSocket message handler
  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as {
      type: string
      text?: string
      data?: string
      conversation_id?: string
      name?: string
      input?: string
      output?: string
      message?: string
      tool_call_id?: string
      duration_ms?: number
      is_error?: boolean
      elapsed_ms?: number
      input_tokens?: number
      output_tokens?: number
      iteration?: number
      total_input_tokens?: number
      total_output_tokens?: number
      iterations?: number
      consumed_tokens?: number
      budget?: number
      tool_name?: string
      repetitions?: number
      sample_input?: string
    }

    switch (msg.type) {
      case 'turn_start': {
        setTurnStatus({
          active: true,
          startTime: Date.now(),
          elapsedMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          activity: 'starting…',
          iteration: 0,
        })
        setIsWaiting(true)
        // A brand-new turn clears any resume prompt and any stale loop
        // warning from the previous one.
        setPendingContinuation(null)
        setLoopWarning(null)
        resetTurnReasoning()
        break
      }

      case 'reasoning_token': {
        const chunk = msg.data ?? msg.text ?? ''
        if (!reasoningRef.current) thinkingStartedAtRef.current = new Date()
        reasoningRef.current += chunk
        setLiveReasoning(reasoningRef.current)
        break
      }

      case 'thinking': {
        setTurnStatus((prev) => (prev ? { ...prev, activity: msg.text ?? 'thinking…' } : prev))
        break
      }

      case 'tool_start': {
        // Backend emits `tool_start` twice for the same invocation:
        // once during streaming (no `input`, assembled later) from internal/agent/stream.go,
        // and once right before execution (with `input`) from internal/agent/loop.go.
        // Dedup by tool_call_id: if a pending ChatMessage for this id already
        // exists, merge the new input in; otherwise push a fresh one.
        const callId = msg.tool_call_id ?? ''
        setMessages((prev) => {
          const existingIdx = callId
            ? prev.findIndex(
                (m) => m.toolCall?.tool_call_id === callId && !m.toolCall.done,
              )
            : -1
          if (existingIdx !== -1) {
            return prev.map((m, i): ChatMessage => {
              if (i !== existingIdx || !m.toolCall) return m
              return {
                ...m,
                toolCall: {
                  ...m.toolCall,
                  name: m.toolCall.name || (msg.name ?? ''),
                  input: msg.input ?? m.toolCall.input,
                },
              }
            })
          }
          return [
            ...prev,
            bakeReasoningIfFirst({
              id: uuid(),
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolCall: {
                name: msg.name ?? '',
                input: msg.input ?? '',
                tool_call_id: callId,
                done: false,
              },
            }),
          ]
        })
        setTurnStatus((prev) => (prev ? { ...prev, activity: `running ${msg.name}…` } : prev))
        break
      }

      case 'tool_done': {
        setMessages((prev) =>
          prev.map((m): ChatMessage => {
            const tc = m.toolCall
            if (tc && tc.tool_call_id === msg.tool_call_id && !tc.done) {
              return {
                ...m,
                toolCall: {
                  name: tc.name,
                  input: tc.input,
                  tool_call_id: tc.tool_call_id,
                  output: msg.output,
                  done: true,
                  duration_ms: msg.duration_ms,
                  isError: msg.is_error,
                },
              }
            }
            return m
          }),
        )
        setTurnStatus((prev) => (prev ? { ...prev, activity: 'processing…' } : prev))
        break
      }

      case 'tool_assembled':
        // input fully assembled — already shown via tool_start
        break

      case 'iteration_limit_reached': {
        // Backend hit the configured max-iterations cap for this turn.
        const iterations = typeof msg.iterations === 'number' ? msg.iterations : 0
        if (iterations > 0) {
          setPendingContinuation({ kind: 'iteration_limit', iterations })
        }
        break
      }

      case 'token_budget_reached': {
        // Backend crossed the configured cumulative-token budget for this turn.
        const consumed = typeof msg.consumed_tokens === 'number' ? msg.consumed_tokens : 0
        const budget = typeof msg.budget === 'number' ? msg.budget : 0
        if (budget > 0) {
          setPendingContinuation({ kind: 'token_budget', consumedTokens: consumed, budget })
        }
        break
      }

      case 'loop_detected': {
        // Backend flagged the same tool+input being called repeatedly. Show
        // a passive warning — not a blocker, the agent keeps running.
        const toolName = typeof msg.tool_name === 'string' ? msg.tool_name : ''
        const reps = typeof msg.repetitions === 'number' ? msg.repetitions : 0
        if (toolName && reps > 0) {
          setLoopWarning({ toolName, repetitions: reps })
        }
        break
      }

      case 'status':
      case 'stream_usage': {
        setTurnStatus((prev) =>
          prev
            ? {
                ...prev,
                inputTokens: msg.input_tokens ?? prev.inputTokens,
                outputTokens: msg.output_tokens ?? prev.outputTokens,
                elapsedMs: msg.elapsed_ms ?? prev.elapsedMs,
                iteration: msg.iteration ?? prev.iteration,
              }
            : prev,
        )
        break
      }

      case 'turn_end': {
        setTurnStatus((prev) =>
          prev
            ? {
                ...prev,
                active: false,
                elapsedMs: msg.elapsed_ms ?? prev.elapsedMs,
                inputTokens: msg.total_input_tokens ?? prev.inputTokens,
                outputTokens: msg.total_output_tokens ?? prev.outputTokens,
                iteration: msg.iterations ?? prev.iteration,
              }
            : prev,
        )
        setIsWaiting(false)
        break
      }

      case 'token': {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + (msg.text ?? '') }]
          }
          return [
            ...prev,
            bakeReasoningIfFirst({
              id: uuid(),
              role: 'assistant',
              content: msg.text ?? '',
              timestamp: new Date(),
              isStreaming: true,
            }),
          ]
        })
        break
      }

      case 'message': {
        setMessages((prev) => [
          ...prev,
          bakeReasoningIfFirst({
            id: uuid(),
            role: 'assistant',
            content: msg.text ?? '',
            timestamp: new Date(),
            isStreaming: false,
          }),
        ])
        setIsWaiting(false)
        break
      }

      case 'done': {
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last.isStreaming) {
            return [...prev.slice(0, -1), { ...last, isStreaming: false }]
          }
          return prev
        })
        setIsWaiting(false)
        break
      }

      case 'error': {
        setError(msg.message ?? 'Unknown error')
        setIsWaiting(false)
        break
      }
    }
  }, [bakeReasoningIfFirst, resetTurnReasoning])

  const { status, send } = useWebSocket({ path: '/ws/chat', onMessage: handleWsMessage })

  // ── Auto-scroll
  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveReasoning, autoScroll])

  const hasNewMessages = !autoScroll && messages.length > 0

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setAutoScroll(atBottom)
  }

  const scrollToBottom = () => {
    setAutoScroll(true)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── File upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setIsUploading(true)
    setError(null)
    try {
      const res = await api.uploadFile(file)
      setPendingAttachments((prev) => [
        ...prev,
        { sha256: res.sha256, mime: res.mime, size: res.size, filename: file.name },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // ── Send
  const handleSend = () => {
    const text = input.trim()
    if (!text && pendingAttachments.length === 0) return
    if (isWaiting) return
    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined
    setMessages((prev) => [
      ...prev,
      {
        id: uuid(),
        role: 'user',
        content: text || (attachments ? `[${attachments.map((a) => a.filename).join(', ')}]` : ''),
        timestamp: new Date(),
        attachments,
      },
    ])
    setInput('')
    setPendingAttachments([])
    setIsWaiting(true)
    setError(null)
    setAutoScroll(true)
    resetTurnReasoning()
    // A fresh user message supersedes any pending continuation prompt.
    setPendingContinuation(null)
    send({ type: 'message', text, attachments })
  }

  // ── Continue a turn that hit the iteration limit. Emits a dedicated WS
  // command so the backend resumes the existing conversation without
  // inserting a synthetic user message. `unlimited=true` lifts the cap for
  // the rest of the turn (still bounded by the total-timeout).
  const handleContinue = (unlimited: boolean) => {
    if (isWaiting) return
    setPendingContinuation(null)
    setIsWaiting(true)
    setError(null)
    setAutoScroll(true)
    resetTurnReasoning()
    send({ type: 'continue_turn', unlimited })
  }

  const turns = useMemo(() => groupTurns(messages), [messages])
  // Defer history re-renders so typing in LiminalInput stays snappy while the
  // (memoized) message list eventually catches up on an idle frame.
  const deferredTurns = useDeferredValue(turns)
  const renderedTurns = useMemo(
    () =>
      deferredTurns.map((t) =>
        t.kind === 'user' ? (
          <LiminalUserMsg
            key={t.id}
            content={t.content}
            time={t.time}
            badges={
              t.attachments && t.attachments.length > 0
                ? t.attachments.map((a) => <AttachmentChip key={a.sha256} att={a} />)
                : undefined
            }
          />
        ) : (
          <LiminalAssistantMsg
            key={t.id}
            blocks={t.blocks}
            reasoning={t.reasoning}
            reasoningDuration={t.reasoningDuration}
            reasoningStreaming={false}
            streaming={t.streaming}
            time={t.time}
          />
        ),
      ),
    [deferredTurns],
  )
  const showLiveReasoning = liveReasoning.length > 0 && !turnHasMessageRef.current

  return (
    <div className="relative flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 shrink-0 pl-[52px] md:pl-6"
        style={{
          paddingTop: 11,
          paddingBottom: 11,
          paddingRight: 24,
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="font-serif truncate"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.2 }}
          >
            Chat
          </div>
          <div
            className="font-mono flex gap-2"
            style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}
          >
            <span>direct line to Daimon</span>
          </div>
        </div>
        <button
          onClick={() => setFilesDrawerOpen(true)}
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ fontSize: 11, color: 'var(--ink-muted)' }}
        >
          <FolderOpen size={13} />
          <span>files</span>
        </button>
        <ConnectionPill status={status} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mx-4 mt-3 flex items-center gap-2 rounded-md shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--red) 8%, transparent)',
            color: 'var(--red)',
            border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)',
            padding: '8px 14px',
            fontSize: 13,
          }}
        >
          <AlertTriangle size={14} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thread */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {turns.length === 0 && !showLiveReasoning && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p
              className="font-serif italic"
              style={{ fontSize: 16, color: 'var(--ink-muted)' }}
            >
              speak, and Daimon listens.
            </p>
            <p
              className="font-mono"
              style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}
            >
              no thread yet — send a message to begin.
            </p>
          </div>
        )}

        {(deferredTurns.length > 0 || showLiveReasoning || pendingContinuation) && (
          <LiminalThread>
            {renderedTurns}
            {showLiveReasoning && (
              <div style={{ padding: '16px 0 24px' }}>
                <LiminalSpeaker
                  label="Daimon"
                  italic="speaks"
                  color="var(--accent)"
                  glyph={
                    <div className="flex items-center justify-center" style={{ width: 18, height: 18 }}>
                      <LiminalGlyph size={16} animate />
                    </div>
                  }
                />
                <LiminalReasoning text={liveReasoning} streaming />
              </div>
            )}
            {pendingContinuation && !isWaiting && (
              <LiminalContinuePill
                reason={pendingContinuation}
                onContinue={() => handleContinue(false)}
                onContinueUnlimited={() => handleContinue(true)}
                disabled={isWaiting}
              />
            )}
            <div ref={messagesEndRef} />
          </LiminalThread>
        )}
      </div>

      {/* Scroll-to-bottom pill */}
      {hasNewMessages && (
        <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ bottom: 96 }}>
          <button
            onClick={scrollToBottom}
            className="font-mono flex items-center gap-1.5 rounded-md cursor-pointer"
            style={{
              background: 'var(--accent)', color: 'var(--bg-elev)',
              fontSize: 11, fontWeight: 600,
              padding: '5px 12px',
            }}
          >
            <ChevronDown size={12} /> new message
          </button>
        </div>
      )}

      {/* Live status */}
      <LiveStatus turnStatus={turnStatus} loopWarning={loopWarning} />

      {/* Pending attachments + attach button row above input */}
      {(pendingAttachments.length > 0 || isUploading) && (
        <div
          className="flex flex-wrap gap-1.5 shrink-0"
          style={{ padding: '8px 16px 0', background: 'var(--bg)' }}
        >
          {pendingAttachments.map((att) => (
            <AttachmentChip
              key={att.sha256}
              att={att}
              onRemove={() => setPendingAttachments((prev) => prev.filter((a) => a.sha256 !== att.sha256))}
            />
          ))}
          {isUploading && (
            <span
              className="inline-flex items-center gap-1.5 rounded-[4px]"
              style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                padding: '3px 8px',
                fontSize: 11,
                color: 'var(--ink-muted)',
              }}
            >
              <span
                className="rounded-full animate-spin inline-block"
                style={{
                  width: 10, height: 10,
                  border: '1.5px solid var(--line)',
                  borderTopColor: 'var(--accent)',
                }}
              />
              uploading…
            </span>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Input */}
      <LiminalInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        disabled={isWaiting || status !== 'connected'}
        onAttach={() => fileInputRef.current?.click()}
        autoFocus={false}
      />

      {/* Files drawer */}
      <FilesDrawer open={filesDrawerOpen} onClose={() => setFilesDrawerOpen(false)} />
    </div>
  )
}
