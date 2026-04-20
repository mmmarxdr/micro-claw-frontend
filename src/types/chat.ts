export type MessageRole = 'user' | 'assistant' | 'tool'

export interface ToolCall {
  name: string
  input: string
  output?: string
  tool_call_id: string
  done: boolean
  duration_ms?: number
  isError?: boolean
}

export interface Attachment {
  sha256: string
  mime: string
  size: number
  filename: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  toolCall?: ToolCall
  isStreaming?: boolean
  attachments?: Attachment[]
  /** Reasoning text baked into the first non-user message of a turn (so past turns keep their reasoning). */
  reasoning?: string
  reasoningStartedAt?: Date
  reasoningEndedAt?: Date
}

export interface MediaMeta {
  sha256: string
  mime: string
  size: number
  created_at: string
  last_referenced_at: string
}

export interface TurnStatus {
  active: boolean
  startTime: number  // Date.now()
  elapsedMs: number
  inputTokens: number
  outputTokens: number
  activity: string   // from "thinking" frames
  iteration: number
}
