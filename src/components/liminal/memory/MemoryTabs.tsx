export type MemoryTab = 'memory' | 'knowledge'

interface MemoryTabsProps {
  tab: MemoryTab
  setTab: (t: MemoryTab) => void
  memoryCount: number
  knowledgeCount: number
}

interface TabDef {
  k: MemoryTab
  l: string
  italic: string
  count: number
}

export function MemoryTabs({ tab, setTab, memoryCount, knowledgeCount }: MemoryTabsProps) {
  const tabs: TabDef[] = [
    { k: 'memory',    l: 'Long-term memory', italic: 'what I remember',   count: memoryCount },
    { k: 'knowledge', l: 'Knowledge',        italic: "what you've given me", count: knowledgeCount },
  ]
  return (
    <div
      className="flex"
      style={{
        gap: 0,
        borderBottom: '1px solid var(--line)',
        marginBottom: 24,
      }}
    >
      {tabs.map((t) => {
        const on = tab === t.k
        return (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className="font-sans flex items-baseline cursor-pointer relative"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0 0 14px',
              marginRight: 32,
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: on ? 600 : 400,
                color: on ? 'var(--ink)' : 'var(--ink-muted)',
                letterSpacing: -0.1,
              }}
            >
              {t.l}
            </span>
            <span
              className="font-serif italic"
              style={{
                fontSize: 13,
                color: on ? 'var(--accent)' : 'var(--ink-faint)',
              }}
            >
              — {t.italic}
            </span>
            <span
              className="font-mono rounded-full"
              style={{
                fontSize: 10.5,
                color: 'var(--ink-muted)',
                background: on ? 'var(--bg-deep)' : 'transparent',
                padding: '1px 7px',
                border: '1px solid var(--line)',
              }}
            >
              {t.count}
            </span>
            {on && (
              <span
                className="absolute"
                style={{
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 2,
                  background: 'var(--accent)',
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
