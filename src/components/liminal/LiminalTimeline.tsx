import { LiminalChip } from './LiminalChip'

export type TimelineLevel = 'info' | 'warn' | 'error'

export interface TimelineEvent {
  t: string
  lvl: TimelineLevel
  msg: string
}

const LVL_COLOR: Record<TimelineLevel, string> = {
  info:  'var(--accent)',
  warn:  'var(--amber)',
  error: 'var(--red)',
}

const LVL_CHIP: Record<TimelineLevel, 'teal' | 'amber' | 'red'> = {
  info:  'teal',
  warn:  'amber',
  error: 'red',
}

export function LiminalTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div
      className="my-2.5 rounded-[5px]"
      style={{
        padding: '10px 0',
        border: '1px solid var(--line)',
        background: 'var(--bg-elev)',
      }}
    >
      {events.map((e, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 relative"
          style={{ padding: '5px 14px' }}
        >
          <span
            className="font-mono text-ink-muted"
            style={{ fontSize: 11, width: 42 }}
          >
            {e.t}
          </span>
          <span
            className="shrink-0"
            style={{
              width: 7, height: 7, borderRadius: 99,
              background: LVL_COLOR[e.lvl],
              boxShadow: `0 0 4px color-mix(in srgb, ${LVL_COLOR[e.lvl]} 50%, transparent)`,
            }}
          />
          <span className="flex-1 text-ink" style={{ fontSize: 12.5 }}>
            {e.msg}
          </span>
          <LiminalChip color={LVL_CHIP[e.lvl]} soft>{e.lvl}</LiminalChip>
        </div>
      ))}
    </div>
  )
}
