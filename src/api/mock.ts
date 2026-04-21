// ─── Mock API + MockWebSocket ─────────────────────────────────────────────────
// Provides in-memory implementations of the real API and WebSocket interfaces.
// Activated when VITE_MOCK === 'true'. Never imported in production builds.

import type { AgentStatus, ApiKnowledgeDoc, MetricsSnapshot, Conversation, ConversationSummary, MemoryEntry, MCPServer, MCPServerConfig, MCPTestResult, UploadResponse, MediaMeta } from './client'
import { uuid } from '../lib/uuid'
import {
  seedStatus,
  seedMetrics,
  seedMetricsHistory,
  seedConversations,
  seedMemory,
  seedConfig,
} from './mock-data'

// ─── Task 2.1: Mock state singleton ──────────────────────────────────────────

interface MockState {
  conversations: Conversation[]
  memory:        MemoryEntry[]
  config:        Record<string, unknown>
  mcpServers:    MCPServer[]
}

// Spread copies so mutations don't corrupt the seed constants.
// On page refresh the module re-executes and state resets to seed data.
const mockState: MockState = {
  conversations: seedConversations.map(c => ({ ...c, messages: [...c.messages] })),
  memory:        [...seedMemory],
  config:        JSON.parse(JSON.stringify(seedConfig)),
  mcpServers: [
    { name: 'github', transport: 'stdio', command: 'npx -y @modelcontextprotocol/server-github', url: '', connected: true, tool_count: 8 },
    { name: 'filesystem', transport: 'stdio', command: 'npx -y @modelcontextprotocol/server-filesystem /tmp', url: '', connected: true, tool_count: 5 },
    { name: 'my-http-server', transport: 'http', command: '', url: 'http://localhost:8080/mcp', connected: false, tool_count: 0 },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

function buildMetricsHistory(days: number): MetricsSnapshot {
  // If days matches our seed length, return seed. Otherwise generate dynamically.
  if (days === 30) return { ...seedMetrics, history: [...seedMetricsHistory] }

  const history: MetricsSnapshot['history'] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const base = 0.7 + Math.sin(i * 0.4) * 0.3
    history.push({
      date:          dateStr,
      input_tokens:  Math.round(8_000 * base + i * 120),
      output_tokens: Math.round(5_500 * base + i * 80),
      cost_usd:      parseFloat((0.28 * base + i * 0.004).toFixed(6)),
    })
  }
  return { ...seedMetrics, history }
}

// ─── Task 2.2 & 2.3: mockApi object ──────────────────────────────────────────

export const mockApi = {
  // ── Read endpoints ──

  status: (): Promise<AgentStatus> =>
    delay({ ...seedStatus }),

  metrics: (): Promise<MetricsSnapshot> =>
    delay({ ...seedMetrics, history: [...seedMetricsHistory] }),

  metricsHistory: (days = 30): Promise<MetricsSnapshot> =>
    delay(buildMetricsHistory(days)),

  conversations: (params?: { limit?: number; offset?: number; channel?: string }): Promise<{ items: ConversationSummary[]; total: number }> => {
    let items = mockState.conversations
    if (params?.channel) {
      const ch = params.channel.toLowerCase()
      items = items.filter(c => c.channel_id.toLowerCase().includes(ch))
    }
    const total  = items.length
    const offset = params?.offset ?? 0
    const limit  = params?.limit  ?? 20
    const page   = items.slice(offset, offset + limit)
    const summaries: ConversationSummary[] = page.map(c => ({
      id:            c.id,
      channel_id:    c.channel_id,
      message_count: c.messages.length,
      last_message:  c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '',
      updated_at:    c.updated_at,
    }))
    return delay({ items: summaries, total })
  },

  conversation: (id: string): Promise<Conversation> => {
    const conv = mockState.conversations.find(c => c.id === id)
    if (!conv) return Promise.reject(new Error(`Conversation ${id} not found`))
    return delay({ ...conv, messages: [...conv.messages] })
  },

  // ── Task 2.3: Mutation endpoints ──

  deleteConversation: (id: string): Promise<void> => {
    mockState.conversations = mockState.conversations.filter(c => c.id !== id)
    return delay(undefined as void)
  },

  memory: (q = '', limit = 20): Promise<{ items: MemoryEntry[] }> => {
    let items = mockState.memory
    if (q) {
      const lq = q.toLowerCase()
      items = items.filter(m =>
        m.content.toLowerCase().includes(lq) ||
        m.tags.some(t => t.toLowerCase().includes(lq))
      )
    }
    return delay({ items: items.slice(0, limit).map(m => ({ ...m })) })
  },

  deleteMemory: (): Promise<void> => {
    mockState.memory = []
    return delay(undefined as void)
  },

  deleteMemoryEntry: (id: string): Promise<void> => {
    mockState.memory = mockState.memory.filter(m => m.id !== id)
    return delay(undefined as void)
  },

  postMemory: (content: string, tags: string[]): Promise<MemoryEntry> => {
    const entry: MemoryEntry = {
      id:                     uuid(),
      content,
      tags,
      cluster:                'general',
      importance:             5,
      access_count:           0,
      source_conversation_id: '',
      created_at:             new Date().toISOString(),
    }
    mockState.memory.unshift(entry)
    return delay({ ...entry })
  },

  knowledge: (): Promise<{ items: ApiKnowledgeDoc[] }> => delay({ items: [] }),
  deleteKnowledge: (_id: string): Promise<void> => delay(undefined as void),
  uploadKnowledge: (file: File, title?: string): Promise<ApiKnowledgeDoc> =>
    delay({
      id: uuid(),
      title: title || file.name,
      mime: file.type,
      kind_hint: 'plain',
      sha256: '',
      size: file.size,
      chunk_count: 0,
      token_count: 0,
      access_count: 0,
      status: 'indexing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),

  config: (): Promise<Record<string, unknown>> =>
    delay(JSON.parse(JSON.stringify(mockState.config))),

  models: () => delay([
    { id: 'openrouter/auto', name: 'Auto (best available)', context_length: 128000, prompt_cost: 0, completion_cost: 0, free: true },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', context_length: 1048576, prompt_cost: 0.1, completion_cost: 0.4, free: false },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', context_length: 200000, prompt_cost: 3, completion_cost: 15, free: false },
  ]),

  updateConfig: (data: Record<string, unknown>): Promise<{ message: string }> => {
    // Deep merge top-level keys
    for (const key of Object.keys(data)) {
      if (
        typeof data[key] === 'object' &&
        data[key] !== null &&
        !Array.isArray(data[key]) &&
        typeof mockState.config[key] === 'object' &&
        mockState.config[key] !== null
      ) {
        mockState.config[key] = {
          ...(mockState.config[key] as Record<string, unknown>),
          ...(data[key] as Record<string, unknown>),
        }
      } else {
        mockState.config[key] = data[key]
      }
    }
    return delay({ message: 'Settings saved successfully.' })
  },

  mcpServers: (): Promise<{ servers: MCPServer[] }> =>
    delay({ servers: mockState.mcpServers.map(s => ({ ...s })) }),

  addMCPServer: (server: MCPServerConfig): Promise<MCPServerConfig> => {
    const newServer: MCPServer = {
      name: server.name,
      transport: server.transport,
      command: server.command ? server.command.join(' ') : '',
      url: server.url ?? '',
      connected: false,
      tool_count: 0,
    }
    mockState.mcpServers.push(newServer)
    return delay({ ...server })
  },

  removeMCPServer: (name: string): Promise<void> => {
    mockState.mcpServers = mockState.mcpServers.filter(s => s.name !== name)
    return delay(undefined as void)
  },

  testMCPServer: (name: string): Promise<MCPTestResult> => {
    const server = mockState.mcpServers.find(s => s.name === name)
    if (!server) return delay({ connected: false, error: 'Server not found' })
    if (server.transport === 'http' && server.url.includes('localhost')) {
      return delay({ connected: false, error: 'Connection refused: localhost:8080' }, 600)
    }
    const tools = ['list_files', 'read_file', 'write_file', 'search', 'execute'].slice(0, server.tool_count || 3)
    server.connected = true
    server.tool_count = tools.length
    return delay({ connected: true, tools }, 800)
  },

  // Media
  uploadFile: (_file: File): Promise<UploadResponse> => delay({
    sha256: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
    mime: 'application/octet-stream',
    size: 1024,
    filename: 'mock-file.txt',
  }, 300),
  listMedia: (): Promise<MediaMeta[]> => delay([]),
  deleteMedia: (_sha256: string): Promise<void> => delay(undefined as void),

  tools: () => delay([
    { name: 'shell_exec', description: 'Execute a shell command', schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
    { name: 'read_file', description: 'Read file contents', schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
    { name: 'write_file', description: 'Write content to a file', schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
    { name: 'list_files', description: 'List files in a directory', schema: { type: 'object', properties: { path: { type: 'string' } } } },
    { name: 'http_fetch', description: 'Fetch content from a URL', schema: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' } }, required: ['url'] } },
  ]),

  // Auth namespace — mock dev mode always succeeds
  auth: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login: (_token: string): Promise<void> => delay(undefined as void),
    logout: (): Promise<void> => delay(undefined as void),
  },
}

// ─── Task 2.4–2.9: MockWebSocket class ───────────────────────────────────────

// Pre-defined auto-reply sentences for the chat simulation (Task 2.7)
const MOCK_REPLIES: string[] = [
  "I understand your request. Let me process that for you right away.",
  "That's an interesting question! Based on my knowledge, I can provide you with the following information.",
  "Sure, I'll help you with that. Here's what I found after checking the available tools.",
  "Let me think through this step by step to give you the most accurate answer possible.",
  "Great question! Here is a detailed explanation of how this works under the hood.",
  "I've completed the requested task. Here's a summary of what was done and the results.",
  "After analyzing your request, I believe the best approach would be to break it down into smaller steps.",
  "I can certainly help with that. Here's what you need to know about this topic.",
]

// Log message pool for the /ws/logs simulation (Task 2.5)
const LOG_MESSAGES: Array<{ level: string; msg: string; component: string; latency_ms?: number }> = [
  { level: 'INFO',  msg: 'Agent started successfully',          component: 'core' },
  { level: 'INFO',  msg: 'Connected to Telegram webhook',       component: 'channels' },
  { level: 'DEBUG', msg: 'Tool registry loaded (3 tools)',      component: 'tools' },
  { level: 'INFO',  msg: 'Processing incoming message',         component: 'core' },
  { level: 'DEBUG', msg: 'Running shell tool: ls -la',          component: 'shell', latency_ms: 12 },
  { level: 'INFO',  msg: 'Shell command completed',             component: 'shell', latency_ms: 14 },
  { level: 'DEBUG', msg: 'Sending response to user',            component: 'channels' },
  { level: 'INFO',  msg: 'Conversation saved to memory',        component: 'memory' },
  { level: 'WARN',  msg: 'Rate limit approaching (80%)',        component: 'provider' },
  { level: 'INFO',  msg: 'Memory search completed (5 results)', component: 'memory', latency_ms: 8 },
  { level: 'DEBUG', msg: 'HTTP tool request initiated',         component: 'http', latency_ms: 210 },
  { level: 'ERROR', msg: 'HTTP request timeout after 30s',      component: 'http' },
  { level: 'INFO',  msg: 'Retrying HTTP request (attempt 2)',   component: 'http' },
  { level: 'INFO',  msg: 'Provider response received',          component: 'provider', latency_ms: 840 },
  { level: 'DEBUG', msg: 'Streaming tokens to client',          component: 'channels' },
]

export class MockWebSocket {
  // Duck-typed browser WebSocket interface — consumed by useWebSocket.ts
  readyState: number = 0 // WebSocket.CONNECTING

  onopen:    ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose:   ((event: CloseEvent) => void) | null = null
  onerror:   ((event: Event) => void) | null = null

  private path: string
  private timers: ReturnType<typeof setInterval>[] = []

  constructor(path: string) {
    this.path = path
    // Task 2.4: Simulate async connect — fire onopen after 50ms
    setTimeout(() => {
      this.readyState = 1 // WebSocket.OPEN
      this.onopen?.(new Event('open'))
      this._startSimulation()
    }, 50)
  }

  // Task 2.4: send() — used by ChatPage via useWebSocket
  send(data: string): void {
    if (this.readyState !== 1) return
    if (this.path === '/ws/chat') {
      try {
        const parsed = JSON.parse(data) as { type?: string; text?: string }
        this._handleChatMessage(parsed)
      } catch {
        // ignore malformed frames
      }
    }
    // /ws/logs and /ws/metrics: ignore outbound sends
  }

  // Task 2.8: close() — stops all timers and fires onclose
  close(): void {
    this.timers.forEach(id => clearInterval(id))
    this.timers = []
    this.readyState = 3 // WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  // Task 2.9: _emit() — wraps payload in a MessageEvent
  private _emit(payload: unknown): void {
    if (this.readyState !== 1) return
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(payload) }))
  }

  // ── Simulation dispatcher (called after onopen fires) ──

  private _startSimulation(): void {
    if (this.path === '/ws/logs')    this._simulateLogs()
    if (this.path === '/ws/metrics') this._simulateMetrics()
    // /ws/chat is purely reactive — driven by send()
  }

  // ── Task 2.5: /ws/logs simulation ────────────────────────────────────────

  private _simulateLogs(): void {
    // Emit 3 startup entries immediately on open
    const startupMsgs = LOG_MESSAGES.slice(0, 3)
    startupMsgs.forEach((m, i) => {
      setTimeout(() => {
        this._emit({
          time:      new Date().toISOString(),
          level:     m.level,
          msg:       m.msg,
          component: m.component,
          ...(m.latency_ms !== undefined ? { latency_ms: m.latency_ms } : {}),
        })
      }, i * 50)
    })

    // Then emit a new random log entry every 2000–3000 ms (jitter)
    const scheduleNext = () => {
      const jitter = 2000 + Math.floor(Math.random() * 1000)
      const id = setTimeout(() => {
        const entry = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)]
        this._emit({
          time:      new Date().toISOString(),
          level:     entry.level,
          msg:       entry.msg,
          component: entry.component,
          ...(entry.latency_ms !== undefined ? { latency_ms: entry.latency_ms } : {}),
        })
        scheduleNext()
      }, jitter)
      // Store as interval-like id so close() can cancel it
      this.timers.push(id as unknown as ReturnType<typeof setInterval>)
    }
    scheduleNext()
  }

  // ── Task 2.6: /ws/metrics simulation ─────────────────────────────────────

  private _simulateMetrics(): void {
    // Emit snapshot immediately on open
    this._emitMetricsSnapshot()

    // Then every 30 seconds
    const id = setInterval(() => {
      this._emitMetricsSnapshot()
    }, 30_000)
    this.timers.push(id)
  }

  private _emitMetricsSnapshot(): void {
    // Slightly vary values each emission so the UI feels live
    const jitter = () => Math.floor(Math.random() * 500)
    this._emit({
      today: {
        input_tokens:  12_450 + jitter(),
        output_tokens:  8_320 + jitter(),
        cost_usd:       0.4218 + Math.random() * 0.01,
        conversations:  7,
        messages:       34,
      },
      month: {
        input_tokens:  287_000,
        output_tokens: 198_000,
        cost_usd:       11.20,
      },
      history: [],   // useMetricsSocket only validates today + month
    })
  }

  // ── Task 2.7: /ws/chat simulation ────────────────────────────────────────

  private _handleChatMessage(msg: { type?: string; text?: string }): void {
    if (msg.type !== 'message') return
    // 400ms "thinking" pause before streaming begins
    setTimeout(() => {
      this._streamReply()
    }, 400)
  }

  private _streamReply(): void {
    const replyText = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
    const words = replyText.split(' ')
    let i = 0

    // Note: this interval is self-clearing and intentionally NOT added to this.timers
    // (it finishes on its own and won't be orphaned — close() handles any in-progress stream
    // by clearing readyState so _emit() becomes a no-op)
    const t = setInterval(() => {
      if (i < words.length) {
        this._emit({ type: 'token', text: words[i++] + ' ' })
      } else {
        clearInterval(t)
        this._emit({ type: 'done' })
      }
    }, 60)
  }
}
