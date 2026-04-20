import { memo } from 'react'
import type { ToolCall } from '../../types/chat'
import { LiminalGlyph } from './LiminalGlyph'
import { LiminalSpeaker } from './LiminalSpeaker'
import { LiminalReasoning } from './LiminalReasoning'
import { LiminalTool } from './LiminalTool'
import { LiminalMd } from './LiminalMd'
import { LiminalTimeline, type TimelineEvent } from './LiminalTimeline'

export type AssistantBlock =
  | { kind: 'text'; content: string; streaming?: boolean }
  | { kind: 'tool'; tool: ToolCall; onOpen?: () => void }
  | { kind: 'timeline'; events: TimelineEvent[] }

interface LiminalAssistantMsgProps {
  blocks: AssistantBlock[]
  /** Reasoning text (already accumulated). */
  reasoning?: string
  /** Reasoning duration label, e.g. "6s". Omit while still streaming. */
  reasoningDuration?: string
  /** True when reasoning tokens are still arriving. */
  reasoningStreaming?: boolean
  /** Optional formatted timestamp. */
  time?: string
  /** True while the whole turn is still streaming (animates the glyph). */
  streaming?: boolean
}

function LiminalAssistantMsgImpl({
  blocks,
  reasoning,
  reasoningDuration,
  reasoningStreaming = false,
  time,
  streaming = false,
}: LiminalAssistantMsgProps) {
  // Whether visible text has begun — drives reasoning auto-collapse.
  const hasTextStarted = blocks.some(
    (b) => b.kind === 'text' && b.content.trim().length > 0,
  )

  return (
    <div style={{ padding: '16px 0 24px' }}>
      <LiminalSpeaker
        label="Daimon"
        italic="speaks"
        time={time}
        color="var(--accent)"
        glyph={
          <div className="flex items-center justify-center" style={{ width: 18, height: 18 }}>
            <LiminalGlyph size={16} animate={streaming} />
          </div>
        }
      />
      {reasoning && (
        <LiminalReasoning
          text={reasoning}
          duration={reasoningDuration}
          streaming={reasoningStreaming}
          hasTextStarted={hasTextStarted}
        />
      )}
      {blocks.map((b, i) => {
        if (b.kind === 'tool') {
          return <LiminalTool key={i} tool={b.tool} onOpen={b.onOpen} />
        }
        if (b.kind === 'text') {
          return (
            <div key={i} style={{ margin: '8px 0' }}>
              <LiminalMd content={b.content} streaming={b.streaming} />
            </div>
          )
        }
        if (b.kind === 'timeline') {
          return <LiminalTimeline key={i} events={b.events} />
        }
        return null
      })}
    </div>
  )
}

function toolEq(a: ToolCall, b: ToolCall): boolean {
  return (
    a.tool_call_id === b.tool_call_id &&
    a.name === b.name &&
    a.input === b.input &&
    a.output === b.output &&
    a.done === b.done &&
    a.duration_ms === b.duration_ms &&
    a.isError === b.isError
  )
}

function timelineEq(a: TimelineEvent[], b: TimelineEvent[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].t !== b[i].t || a[i].lvl !== b[i].lvl || a[i].msg !== b[i].msg) return false
  }
  return true
}

function blocksEq(a: AssistantBlock[], b: AssistantBlock[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (x.kind !== y.kind) return false
    if (x.kind === 'text' && y.kind === 'text') {
      if (x.content !== y.content || x.streaming !== y.streaming) return false
    } else if (x.kind === 'tool' && y.kind === 'tool') {
      if (!toolEq(x.tool, y.tool) || x.onOpen !== y.onOpen) return false
    } else if (x.kind === 'timeline' && y.kind === 'timeline') {
      if (!timelineEq(x.events, y.events)) return false
    }
  }
  return true
}

function propsAreEqual(
  prev: LiminalAssistantMsgProps,
  next: LiminalAssistantMsgProps,
): boolean {
  return (
    prev.reasoning === next.reasoning &&
    prev.reasoningDuration === next.reasoningDuration &&
    prev.reasoningStreaming === next.reasoningStreaming &&
    prev.time === next.time &&
    prev.streaming === next.streaming &&
    blocksEq(prev.blocks, next.blocks)
  )
}

export const LiminalAssistantMsg = memo(LiminalAssistantMsgImpl, propsAreEqual)
