import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Send, AlertTriangle, X, Check, Paperclip, Trash2, FileText, Image, File, FolderOpen } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { StatusBar } from '../components/chat/StatusBar'
import { ThinkingBlock } from '../components/chat/ThinkingBlock'
import { cn } from '../lib/utils'
import { Markdown } from '../components/chat/Markdown'
import { api } from '../api/client'
import type { Attachment, ChatMessage, MediaMeta, ToolCall, TurnStatus } from '../types/chat'

// ── Status indicator ────────────────────────────────────────────────────────
function ConnectionStatus({ status }: { status: string }) {
  const map = {
    connected:    { label: 'Connected',    dot: 'bg-success',               badge: 'success' as const },
    connecting:   { label: 'Connecting…',  dot: 'bg-warning animate-pulse', badge: 'warning' as const },
    disconnected: { label: 'Disconnected', dot: 'bg-text-disabled',         badge: 'default' as const },
    error:        { label: 'Error',        dot: 'bg-error',                 badge: 'error' as const },
  }
  const s = map[status as keyof typeof map] ?? map.disconnected
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-2 h-2 rounded-full', s.dot)} />
      <Badge variant={s.badge}>{s.label}</Badge>
    </div>
  )
}

// ── Format tool input JSON ───────────────────────────────────────────────────
function formatToolInput(input: string): string {
  try { return JSON.stringify(JSON.parse(input), null, 2) } catch { return input }
}

// ── Truncate tool input to a short preview ───────────────────────────────────
function truncateInput(input: string, maxLen: number): string {
  try {
    const parsed = JSON.parse(input)
    if (parsed.command) return parsed.command.length > maxLen ? parsed.command.slice(0, maxLen) + '…' : parsed.command
    if (parsed.url)     return parsed.url.length > maxLen     ? parsed.url.slice(0, maxLen) + '…'     : parsed.url
    if (parsed.path)    return parsed.path.length > maxLen    ? parsed.path.slice(0, maxLen) + '…'    : parsed.path
    const firstVal = Object.values(parsed)[0]
    if (typeof firstVal === 'string') return firstVal.length > maxLen ? firstVal.slice(0, maxLen) + '…' : firstVal
  } catch { /* ignore JSON parse errors — fall through to truncation */ }
  return input.length > maxLen ? input.slice(0, maxLen) + '…' : input
}

// ── Tool call inline (Claude Code style) ────────────────────────────────────
function ToolCallInline({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)

  const inputPreview = toolCall.input ? truncateInput(toolCall.input, 40) : ''

  const durationLabel = (() => {
    if (!toolCall.done) return 'running...'
    if (toolCall.isError) return 'error'
    if (toolCall.duration_ms != null) {
      return toolCall.duration_ms < 1000
        ? `${toolCall.duration_ms}ms`
        : `${(toolCall.duration_ms / 1000).toFixed(1)}s`
    }
    return ''
  })()

  return (
    <div className="my-0.5">
      <button
        onClick={() => toolCall.done && setExpanded(e => !e)}
        className="flex items-center gap-2 text-xs font-mono text-[#71717a] hover:text-[#a1a1aa] transition-colors w-full text-left py-0.5 group"
        style={{ cursor: toolCall.done ? 'pointer' : 'default' }}
      >
        {/* Status indicator */}
        {!toolCall.done && (
          <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </span>
        )}
        {toolCall.done && !toolCall.isError && (
          <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
        )}
        {toolCall.done && toolCall.isError && (
          <X className="w-3 h-3 text-red-400 flex-shrink-0" />
        )}

        {/* Tool name */}
        <span className="text-[#a1a1aa]">{toolCall.name}</span>

        {/* Input preview */}
        {inputPreview && (
          <span className="text-[#555] truncate flex-1">{inputPreview}</span>
        )}

        {/* Duration / status label */}
        <span className={`flex-shrink-0 ml-auto ${toolCall.isError ? 'text-red-400' : 'text-[#555]'}`}>
          {durationLabel}
        </span>

        {/* Expand chevron — only when done */}
        {toolCall.done && (
          <ChevronRight className={`w-3 h-3 text-[#555] transition-transform opacity-0 group-hover:opacity-100 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>

      {/* Expanded details */}
      {expanded && toolCall.done && (
        <div className="ml-5 pl-3 border-l border-[#333] text-xs font-mono space-y-1 py-1">
          {toolCall.input && (
            <div className="text-[#555]">
              <span className="select-none">input: </span>
              <span className="text-[#a1a1aa]">{formatToolInput(toolCall.input)}</span>
            </div>
          )}
          {toolCall.output && (
            <div className="text-[#555]">
              <span className="select-none">output: </span>
              <pre className={`inline whitespace-pre-wrap ${toolCall.isError ? 'text-red-400' : 'text-[#a1a1aa]'}`}>{toolCall.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Message row — terminal style ────────────────────────────────────────────
function MessageRow({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'tool' && msg.toolCall) {
    return (
      <div className="px-4">
        <ToolCallInline toolCall={msg.toolCall} />
      </div>
    )
  }

  const isUser = msg.role === 'user'
  return (
    <div className={cn(
      'px-4 py-2 mb-1',
      isUser
        ? 'border-l-2 border-l-accent'
        : 'border-l-2 border-l-border-strong'
    )}>
      {isUser ? (
        <>
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {msg.attachments.map(att => (
                <span key={att.sha256} className="inline-flex items-center gap-1 bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-text-secondary">
                  <FileIcon mime={att.mime} className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{att.filename}</span>
                </span>
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        </>
      ) : (
        <div className="break-words">
          <Markdown content={msg.content} />
          {msg.isStreaming && <span className="animate-pulse ml-0.5 text-accent">▋</span>}
        </div>
      )}
      <p className="text-xs text-text-disabled font-mono mt-1">
        {isUser ? '> you' : '$ agent'} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="px-4 py-2 mb-1 border-l-2 border-l-border-strong">
      <p className="text-sm font-mono text-text-disabled animate-pulse">$ agent is thinking…</p>
    </div>
  )
}

// ── File icon by MIME ───────────────────────────────────────────────────────
function FileIcon({ mime, className }: { mime: string; className?: string }) {
  if (mime.startsWith('image/')) return <Image className={className} />
  if (mime.startsWith('text/'))  return <FileText className={className} />
  return <File className={className} />
}

// ── Format file size ────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Pending attachment pill (below input) ───────────────────────────────────
function AttachmentPill({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface border border-border rounded px-2 py-1 text-xs text-text-secondary">
      <FileIcon mime={att.mime} className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[120px]">{att.filename}</span>
      <span className="text-text-disabled">{formatSize(att.size)}</span>
      <button onClick={onRemove} className="ml-0.5 hover:text-error transition-colors">
        <X size={12} />
      </button>
    </div>
  )
}

// ── Files drawer ────────────────────────────────────────────────────────────
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
      setFiles(prev => prev.filter(f => f.sha256 !== sha256))
    } catch {
      // silently fail — file might already be gone
    } finally {
      setDeleting(null)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l border-border z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Uploaded Files</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}
          {!loading && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <FolderOpen size={24} className="text-text-disabled mb-2" />
              <p className="text-xs text-text-disabled font-mono">No files uploaded yet.</p>
            </div>
          )}
          {!loading && files.map(f => (
            <div key={f.sha256} className="flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-hover-surface transition-colors">
              <FileIcon mime={f.mime} className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-mono truncate">{f.sha256.slice(0, 12)}…</p>
                <p className="text-[10px] text-text-disabled">
                  {f.mime} · {formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(f.sha256)}
                disabled={deleting === f.sha256}
                className="text-text-disabled hover:text-error transition-colors disabled:opacity-50"
              >
                {deleting === f.sha256
                  ? <span className="w-3.5 h-3.5 border-2 border-border border-t-error rounded-full animate-spin inline-block" />
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

// ── Main page ───────────────────────────────────────────────────────────────
export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  // hasNewMsg derived below — no state needed
  const [turnStatus, setTurnStatus] = useState<TurnStatus | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [filesDrawerOpen, setFilesDrawerOpen] = useState(false)

  // Reasoning state (ThinkingBlock)
  const [reasoningBuffer, setReasoningBuffer] = useState('')
  const [hasTextStarted, setHasTextStarted] = useState(false)
  const [thinkingStartedAt, setThinkingStartedAt] = useState<Date | undefined>(undefined)
  const [textStartedAt, setTextStartedAt] = useState<Date | undefined>(undefined)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── WebSocket message handler
  const handleWsMessage = useCallback((data: unknown) => {
    const msg = data as {
      type: string
      text?: string
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
    }

    if (msg.type === 'turn_start') {
      setTurnStatus({ active: true, startTime: Date.now(), elapsedMs: 0, inputTokens: 0, outputTokens: 0, activity: 'Starting...', iteration: 0 })
      setIsWaiting(true)
      // Reset reasoning state for new turn
      setReasoningBuffer('')
      setHasTextStarted(false)
      setThinkingStartedAt(undefined)
      setTextStartedAt(undefined)
    }

    if (msg.type === 'reasoning_token') {
      const data = (msg as unknown as { data?: string }).data ?? (msg as unknown as { text?: string }).text ?? ''
      setReasoningBuffer(prev => {
        if (!prev) setThinkingStartedAt(new Date())
        return prev + data
      })
    }

    if (msg.type === 'thinking') {
      setTurnStatus(prev => prev ? { ...prev, activity: msg.text ?? 'Thinking...' } : prev)
    }

    if (msg.type === 'tool_start') {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'tool' as const,
        content: '',
        timestamp: new Date(),
        toolCall: { name: msg.name ?? '', input: msg.input ?? '', tool_call_id: msg.tool_call_id ?? '', done: false }
      }])
      setTurnStatus(prev => prev ? { ...prev, activity: `Running ${msg.name}...` } : prev)
    }

    if (msg.type === 'tool_done') {
      setMessages(prev => prev.map((m): ChatMessage => {
        const tc = m.toolCall
        if (tc && tc.tool_call_id === msg.tool_call_id && !tc.done) {
          return { ...m, toolCall: { name: tc.name, input: tc.input, tool_call_id: tc.tool_call_id, output: msg.output, done: true, duration_ms: msg.duration_ms, isError: msg.is_error } }
        }
        return m
      }))
      setTurnStatus(prev => prev ? { ...prev, activity: 'Processing...' } : prev)
    }

    if (msg.type === 'tool_assembled') {
      // tool input fully assembled — no UI action needed, already shown via tool_start
    }

    if (msg.type === 'status' || msg.type === 'stream_usage') {
      setTurnStatus(prev => prev ? {
        ...prev,
        inputTokens: msg.input_tokens ?? prev.inputTokens,
        outputTokens: msg.output_tokens ?? prev.outputTokens,
        elapsedMs: msg.elapsed_ms ?? prev.elapsedMs,
        iteration: msg.iteration ?? prev.iteration,
      } : prev)
    }

    if (msg.type === 'turn_end') {
      setTurnStatus(prev => prev ? {
        ...prev,
        active: false,
        elapsedMs: msg.elapsed_ms ?? prev.elapsedMs,
        inputTokens: msg.total_input_tokens ?? prev.inputTokens,
        outputTokens: msg.total_output_tokens ?? prev.outputTokens,
        iteration: msg.iterations ?? prev.iteration,
      } : prev)
      setIsWaiting(false)
    }

    if (msg.type === 'token') {
      // Mark that text content has started (triggers ThinkingBlock auto-collapse)
      setHasTextStarted(prev => {
        if (!prev) setTextStartedAt(new Date())
        return true
      })
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, content: last.content + (msg.text ?? '') }]
        }
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: msg.text ?? '', timestamp: new Date(), isStreaming: true }]
      })
      setIsTyping(false)
    }

    if (msg.type === 'message') {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: msg.text ?? '', timestamp: new Date(), isStreaming: false }])
      setIsTyping(false)
      setIsWaiting(false)
    }

    if (msg.type === 'done') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }]
        }
        return prev
      })
      setIsTyping(false)
      setIsWaiting(false)
    }

    if (msg.type === 'error') {
      setError(msg.message ?? 'Unknown error')
      setIsTyping(false)
      setIsWaiting(false)
    }
  }, [])

  const { status, send } = useWebSocket({ path: '/ws/chat', onMessage: handleWsMessage })

  // ── Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, autoScroll])

  // Derive new-message indicator separately to avoid setState-in-effect.
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
    e.target.value = '' // reset so same file can be re-selected
    setIsUploading(true)
    setError(null)
    try {
      const res = await api.uploadFile(file)
      setPendingAttachments(prev => [...prev, {
        sha256: res.sha256,
        mime: res.mime,
        size: res.size,
        filename: file.name,
      }])
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
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || (attachments ? `[${attachments.map(a => a.filename).join(', ')}]` : ''),
      timestamp: new Date(),
      attachments,
    }])
    setInput('')
    setPendingAttachments([])
    setIsTyping(true)
    setIsWaiting(true)
    setError(null)
    setAutoScroll(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    send({ type: 'message', text, attachments })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div className="relative flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-text-primary">Chat</h1>
          <p className="text-xs text-text-secondary">Talk to the agent directly from the browser.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilesDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <FolderOpen size={14} />
            <span>Files</span>
          </button>
          <ConnectionStatus status={status} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-error-light text-error border border-error/30 rounded-md px-4 py-2 text-sm shrink-0">
          <AlertTriangle size={14} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 flex flex-col gap-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-sm font-medium text-text-secondary font-mono">$ awaiting input</p>
            <p className="text-xs text-text-disabled mt-1 font-mono">Send a message to start a session.</p>
          </div>
        )}

        {messages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
        {reasoningBuffer && (
          <div className="px-4">
            <ThinkingBlock
              reasoning={reasoningBuffer}
              isStreaming={!hasTextStarted}
              hasTextStarted={hasTextStarted}
              thinkingStartedAt={thinkingStartedAt}
              textStartedAt={textStartedAt}
            />
          </div>
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom pill */}
      {hasNewMessages && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 bg-accent text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
          >
            <ChevronDown size={12} /> New message
          </button>
        </div>
      )}

      {/* Status bar — between messages and input */}
      <StatusBar turnStatus={turnStatus} />

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        {/* Pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pendingAttachments.map(att => (
              <AttachmentPill
                key={att.sha256}
                att={att}
                onRemove={() => setPendingAttachments(prev => prev.filter(a => a.sha256 !== att.sha256))}
              />
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isWaiting}
            className={cn(
              'shrink-0 h-10 w-10 flex items-center justify-center rounded-md border border-border text-text-secondary',
              'hover:text-text-primary hover:border-border-strong transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Attach file"
          >
            {isUploading
              ? <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
              : <Paperclip size={16} />
            }
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isWaiting}
            placeholder="Message the agent… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className={cn(
              'flex-1 resize-none overflow-hidden bg-transparent border border-border rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled font-mono',
              'focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[120px]'
            )}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isWaiting || status !== 'connected'}
            className="shrink-0 h-10 w-10 p-0 flex items-center justify-center"
          >
            {isWaiting
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={16} />
            }
          </Button>
        </div>
        <p className="text-[10px] text-text-disabled mt-1.5 text-center font-mono">
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Files drawer */}
      <FilesDrawer open={filesDrawerOpen} onClose={() => setFilesDrawerOpen(false)} />
    </div>
  )
}
