import { useState } from 'react'
import { LiminalThread } from '../components/liminal/LiminalThread'
import { LiminalUserMsg } from '../components/liminal/LiminalUserMsg'
import { LiminalAssistantMsg, type AssistantBlock } from '../components/liminal/LiminalAssistantMsg'
import { LiminalInput } from '../components/liminal/LiminalInput'
import { MOCK_CONVO } from '../design/mocks'

/**
 * /design — visual preview of the Liminal chat system rendered against the
 * mock conversation from the Anthropic Claude Design handoff. No real
 * WebSocket connection — purely for design validation.
 */
export function DesignPage() {
  const [draft, setDraft] = useState('')

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: '11px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="font-serif truncate"
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.2 }}
          >
            Payment service anomalies
          </div>
          <div
            className="font-mono flex gap-2.5"
            style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}
          >
            <span>started 14:32</span><span>·</span>
            <span>5 tools</span><span>·</span>
            <span>$0.042</span><span>·</span>
            <span>4 iter</span>
          </div>
        </div>
        <span
          className="font-mono flex items-center gap-1.5 rounded-full"
          style={{
            fontSize: 10.5, color: 'var(--accent)',
            padding: '3px 9px',
            border: '1px solid color-mix(in srgb, var(--accent) 27%, transparent)',
            background: 'var(--accent-soft)',
          }}
        >
          <span
            className="liminal-breathe"
            style={{
              width: 5, height: 5, borderRadius: 99,
              background: 'var(--accent)',
              boxShadow: '0 0 4px var(--accent)',
            }}
          />
          listening
        </span>
      </div>

      {/* Scrollable conversation */}
      <div className="flex-1 overflow-auto relative">
        <LiminalThread>
          {MOCK_CONVO.map((m) =>
            m.role === 'user' ? (
              <LiminalUserMsg key={m.id} content={m.content} time={m.time} initials="AR" />
            ) : (
              <LiminalAssistantMsg
                key={m.id}
                blocks={m.blocks as AssistantBlock[]}
                reasoning={m.reasoning}
                reasoningDuration={m.reasoningDuration}
                reasoningStreaming={m.reasoningStreaming}
                streaming={m.streaming}
                time={m.time}
              />
            ),
          )}
        </LiminalThread>
      </div>

      {/* Input */}
      <LiminalInput
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          // Design preview — does nothing on submit; this is purely visual.
          setDraft('')
        }}
        autoFocus={false}
      />
    </div>
  )
}
