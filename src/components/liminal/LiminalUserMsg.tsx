import { memo, type ReactNode } from 'react'
import { LiminalSpeaker } from './LiminalSpeaker'

interface LiminalUserMsgProps {
  /** Message body — plain text or simple markdown (rendered as-is). */
  content: string
  /** Optional formatted timestamp shown right-aligned. */
  time?: string
  /** Initials shown in the gutter glyph. Defaults to "Y". */
  initials?: string
  /** Optional row of pills/badges rendered above the message content (e.g. attachments). */
  badges?: ReactNode
}

export const LiminalUserMsg = memo(function LiminalUserMsg({
  content,
  time,
  initials = 'Y',
  badges,
}: LiminalUserMsgProps) {
  return (
    <div style={{ padding: '18px 0 8px' }}>
      <LiminalSpeaker
        label="You"
        time={time}
        color="var(--ink)"
        glyph={
          <div
            className="font-sans flex items-center justify-center rounded-[4px]"
            style={{
              width: 18, height: 18,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 9, fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            {initials.slice(0, 2).toUpperCase()}
          </div>
        }
      />
      {badges && <div className="mb-1.5 flex flex-wrap gap-1.5">{badges}</div>}
      <div
        className="font-sans text-ink whitespace-pre-wrap"
        style={{ fontSize: 13.5, lineHeight: 1.6 }}
      >
        {content}
      </div>
    </div>
  )
})
