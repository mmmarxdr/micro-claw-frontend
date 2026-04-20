import type { ChatMessage } from '../types/chat'
import type { AssistantBlock } from '../components/liminal/LiminalAssistantMsg'

export type Turn =
  | { kind: 'user'; id: string; content: string; time: string; attachments?: ChatMessage['attachments'] }
  | {
      kind: 'assistant'
      id: string
      blocks: AssistantBlock[]
      reasoning?: string
      reasoningDuration?: string
      reasoningStreaming?: boolean
      streaming: boolean
      time: string
    }

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(start?: Date, end?: Date): string | undefined {
  if (!start || !end) return undefined
  const ms = end.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  return `${Math.round(ms / 1000)}s`
}

/**
 * Group a flat ChatMessage[] into turns suitable for Liminal rendering.
 *
 * - User messages become `kind: 'user'` turns
 * - Consecutive assistant + tool messages collapse into a single
 *   `kind: 'assistant'` turn whose `blocks` mirror the message order
 * - Reasoning baked into any message inside the turn surfaces on the turn
 *   (first non-empty one wins)
 */
export function groupTurns(messages: ChatMessage[]): Turn[] {
  const turns: Turn[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      turns.push({
        kind: 'user',
        id: m.id,
        content: m.content,
        time: fmtTime(m.timestamp),
        attachments: m.attachments,
      })
      continue
    }

    const last = turns[turns.length - 1]
    const block: AssistantBlock | null =
      m.role === 'tool' && m.toolCall
        ? { kind: 'tool', tool: m.toolCall }
        : m.role === 'assistant' && m.content
          ? { kind: 'text', content: m.content, streaming: m.isStreaming }
          : null

    if (last && last.kind === 'assistant') {
      if (block) last.blocks.push(block)
      if (m.reasoning && !last.reasoning) {
        last.reasoning = m.reasoning
        last.reasoningDuration = fmtDuration(m.reasoningStartedAt, m.reasoningEndedAt)
      }
      if (m.isStreaming) last.streaming = true
      last.time = fmtTime(m.timestamp)
    } else {
      turns.push({
        kind: 'assistant',
        id: m.id,
        blocks: block ? [block] : [],
        reasoning: m.reasoning,
        reasoningDuration: fmtDuration(m.reasoningStartedAt, m.reasoningEndedAt),
        reasoningStreaming: false,
        streaming: !!m.isStreaming,
        time: fmtTime(m.timestamp),
      })
    }
  }
  return turns
}
