const BASE_URL = '/api'
const TOKEN_KEY = 'microagent_auth_token'

// ─── Auth token management ───────────────────────────────────────────────────

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
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

export interface ModelInfo {
  id: string
  name: string
  context_length: number
  prompt_cost: number
  completion_cost: number
  free: boolean
}

// ─── API functions ────────────────────────────────────────────────────────────

const _realApi = {
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

  models: () => request<ModelInfo[]>('/models'),
}

// ─── WebSocket helper ─────────────────────────────────────────────────────────

import { mockApi as _mockApi, MockWebSocket as _MockWebSocket } from './mock'

export function createWebSocket(path: string): WebSocket {
  if (import.meta.env.VITE_MOCK === 'true') {
    return new _MockWebSocket(path) as unknown as WebSocket
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  const token = getAuthToken()
  const url = token
    ? `${protocol}//${host}${path}?token=${encodeURIComponent(token)}`
    : `${protocol}//${host}${path}`
  return new WebSocket(url)
}

// ─── Conditional mock swap (tree-shaken in production) ────────────────────────

export const api = import.meta.env.VITE_MOCK === 'true' ? _mockApi : _realApi
