const BASE_URL = '/api'

// ─── HTTP client ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })
  if (!res.ok) {
    if (res.status === 401) {
      throw new AuthError('Unauthorized')
    }
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as T
  return res.json()
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// ─── Types (mirroring API contract from dashboard-design.md) ─────────────────

export interface AgentStatus {
  status: 'running' | 'idle' | 'error'
  uptime_seconds: number
  version: string
}

export interface MetricsSnapshot {
  today: {
    input_tokens: number
    output_tokens: number
    cost_usd: number
    conversations: number
    messages: number
  }
  month: {
    input_tokens: number
    output_tokens: number
    cost_usd: number
  }
  history: Array<{
    date: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
  }>
}

export interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  channel_id: string
  messages: Message[]
  created_at: string
  updated_at: string
}

// Summary shape returned by GET /api/conversations (list endpoint).
// The full Conversation (with messages array) is only returned by GET /api/conversations/:id.
export interface ConversationSummary {
  id: string
  channel_id: string
  message_count: number
  last_message: string
  updated_at: string
}

export interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  source_conversation_id: string
  created_at: string
}

export interface ToolInfo {
  name: string
  description: string
  schema: Record<string, unknown>
}

export interface ModelInfo {
  id: string
  name: string
  context_length: number
  prompt_cost: number
  completion_cost: number
  free: boolean
}

export interface ProviderModelsResponse {
  models: ModelInfo[]
  source: 'live' | 'cache' | 'cache-stale' | 'fallback'
  cached_at: string | null
}

export interface GetProviderModelsOptions {
  refresh?: boolean
}

export async function getProviderModels(
  provider: string,
  opts?: GetProviderModelsOptions
): Promise<ProviderModelsResponse> {
  const url = opts?.refresh
    ? `/api/providers/${encodeURIComponent(provider)}/models?refresh=true`
    : `/api/providers/${encodeURIComponent(provider)}/models`
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export interface MCPServer {
  name: string
  transport: 'stdio' | 'http'
  command: string
  url: string
  connected: boolean
  tool_count: number
}

export interface MCPServerConfig {
  name: string
  transport: 'stdio' | 'http'
  command?: string[]
  url?: string
  prefix_tools?: boolean
  env?: Record<string, string>
}

export interface MCPTestResult {
  connected: boolean
  tools?: string[]
  error?: string
}

// ─── Media types ─────────────────────────────────────────────────────────────

export interface UploadResponse {
  sha256: string
  mime: string
  size: number
  filename?: string
}

export interface MediaMeta {
  sha256: string
  mime: string
  size: number
  created_at: string
  last_referenced_at: string
}

// ─── Media upload (multipart — cannot use request<T> helper) ─────────────────

async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) {
    if (res.status === 401) throw new AuthError('Unauthorized')
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

const authApi = {
  /** POST /api/auth/login — submits token, receives HttpOnly cookie on 204 */
  login: (token: string): Promise<void> =>
    request<void>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /** POST /api/auth/logout — rotates token, clears cookie */
  logout: (): Promise<void> =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),
}

// ─── API functions ────────────────────────────────────────────────────────────

const _realApi = {
  auth: authApi,

  status: () => request<AgentStatus>('/status'),

  metrics: () => request<MetricsSnapshot>('/metrics'),
  metricsHistory: (days = 30) => request<MetricsSnapshot>(`/metrics/history?days=${days}`),

  conversations: (params?: { limit?: number; offset?: number; channel?: string }) => {
    const q = new URLSearchParams()
    if (params?.limit)   q.set('limit',   String(params.limit))
    if (params?.offset)  q.set('offset',  String(params.offset))
    if (params?.channel) q.set('channel', params.channel)
    return request<{ items: ConversationSummary[]; total: number }>(`/conversations?${q}`)
  },

  conversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),

  memory: (q = '', limit = 20) =>
    request<{ items: MemoryEntry[] }>(`/memory?q=${encodeURIComponent(q)}&limit=${limit}`),

  deleteMemory: () => request<void>('/memory', { method: 'DELETE' }),
  deleteMemoryEntry: (id: string) => request<void>(`/memory/${id}`, { method: 'DELETE' }),
  postMemory: (content: string, tags: string[]) =>
    request<MemoryEntry>('/memory', { method: 'POST', body: JSON.stringify({ content, tags }) }),

  config: () => request<Record<string, unknown>>('/config'),
  updateConfig: (config: Record<string, unknown>) =>
    request<{ message: string }>('/config', { method: 'PUT', body: JSON.stringify(config) }),

  tools: () => request<ToolInfo[]>('/tools'),

  models: () => request<ModelInfo[]>('/models'),

  mcpServers: () => request<{ servers: MCPServer[] }>('/mcp/servers'),
  addMCPServer: (server: MCPServerConfig) => request<MCPServerConfig>('/mcp/servers', { method: 'POST', body: JSON.stringify(server) }),
  removeMCPServer: (name: string) => request<void>(`/mcp/servers/${name}`, { method: 'DELETE' }),
  testMCPServer: (name: string) => request<MCPTestResult>(`/mcp/servers/${name}/test`, { method: 'POST' }),

  // Media
  uploadFile,
  listMedia: () => request<MediaMeta[]>('/media'),
  deleteMedia: (sha256: string) => fetch(`${BASE_URL}/media/${sha256}`, {
    method: 'DELETE',
    credentials: 'include',
  }).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  }),
}

// ─── WebSocket helper ─────────────────────────────────────────────────────────

import { mockApi as _mockApi, MockWebSocket as _MockWebSocket } from './mock'

export function createWebSocket(path: string): WebSocket {
  if (import.meta.env.VITE_MOCK === 'true') {
    return new _MockWebSocket(path) as unknown as WebSocket
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  // Browser sends HttpOnly cookies automatically on WebSocket handshake.
  // No ?token= query param — cookie-only auth (FR-41, INV-7).
  return new WebSocket(`${protocol}//${host}${path}`)
}

// ─── Conditional mock swap (tree-shaken in production) ────────────────────────

export const api = import.meta.env.VITE_MOCK === 'true' ? _mockApi : _realApi
