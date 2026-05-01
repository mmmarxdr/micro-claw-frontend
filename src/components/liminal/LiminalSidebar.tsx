import { NavLink } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { LiminalMark } from './LiminalMark'
import { Kbd } from './Kbd'
import { MOD } from '../../lib/platform'

interface NavItem {
  to: string
  glyph: string
  label: string
  badge?: number
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/chat',          glyph: '⫶', label: 'Chat' },
  { to: '/',              glyph: '◇', label: 'Overview', end: true },
  { to: '/conversations', glyph: '▤', label: 'Conversations' },
  { to: '/memory',        glyph: '❋', label: 'Memory' },
  { to: '/tools',         glyph: '⚒', label: 'Tools' },
  { to: '/mcp',           glyph: '⌁', label: 'Integrations' },
  { to: '/metrics',       glyph: '≈', label: 'Metrics' },
  { to: '/logs',          glyph: '∷', label: 'Logs' },
  { to: '/settings',      glyph: '⚙', label: 'Settings' },
]

interface LiminalSidebarProps {
  /** Open the command palette (⌘K). */
  onSummon?: () => void
  /** Mobile drawer open state. */
  drawerOpen?: boolean
  /** Callback invoked when a nav item is clicked while in drawer mode. */
  onClose?: () => void
  /** Footer stats — provide real values when wired; defaults are placeholders. */
  modelLabel?: string
  contextUsage?: { used: number; total: number }
  todayCost?: string
  /** Build version surfaced as a small mono tag in the footer. */
  version?: string
}

export function LiminalSidebar({
  onSummon,
  drawerOpen = false,
  onClose,
  modelLabel = '—',
  contextUsage,
  todayCost = '—',
  version,
}: LiminalSidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { logout } = useAuth()

  const ctxPercent = contextUsage && contextUsage.total > 0
    ? Math.min(100, (contextUsage.used / contextUsage.total) * 100)
    : 0

  return (
    <aside
      className={[
        'font-sans flex flex-col shrink-0 fixed inset-y-0 left-0 z-50',
        'md:relative md:inset-auto md:z-auto',
        'transition-transform duration-200 ease-in-out',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
      ].join(' ')}
      style={{
        width: 208,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--line)',
        padding: '16px 10px',
      }}
    >
      <div style={{ padding: '2px 8px 14px' }}>
        <LiminalMark size={22} />
      </div>

      <button
        type="button"
        onClick={onSummon}
        className="flex items-center gap-2 text-left rounded-[5px] mb-3"
        style={{
          padding: '6px 10px',
          border: '1px solid var(--line)',
          background: 'var(--bg-elev)',
          fontSize: 12,
          color: 'var(--ink-muted)',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-5-5" />
        </svg>
        <span className="flex-1 font-serif italic">summon…</span>
        <Kbd>{MOD} K</Kbd>
      </button>

      <nav className="flex flex-col gap-px">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={drawerOpen ? onClose : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-[4px]',
                'transition-colors',
                isActive ? 'font-medium' : '',
              ].join(' ')
            }
            style={({ isActive }) => ({
              padding: isActive ? '6px 10px 6px 8px' : '6px 10px',
              margin: '1px 0',
              fontSize: 13,
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              background: isActive ? 'var(--bg-elev)' : 'transparent',
              color: isActive ? 'var(--ink)' : 'var(--ink-soft)',
            })}
          >
            {({ isActive }) => (
              <>
                <span
                  className="text-center"
                  style={{
                    width: 14,
                    fontSize: 13,
                    color: isActive ? 'var(--accent)' : 'var(--ink-muted)',
                  }}
                >
                  {item.glyph}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge != null && (
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <div
        className="font-mono"
        style={{
          padding: 10,
          borderTop: '1px solid var(--line)',
          fontSize: 10.5,
          color: 'var(--ink-muted)',
        }}
      >
        <div className="flex justify-between" style={{ padding: '2px 0' }}>
          <span>model</span>
          <span style={{ color: 'var(--ink)' }}>{modelLabel}</span>
        </div>
        {contextUsage && (
          <div className="flex justify-between items-center" style={{ padding: '2px 0' }}>
            <span className="flex items-center gap-1.5">
              <span>ctx</span>
              <span style={{ color: 'var(--ink)' }}>{Math.round(ctxPercent)}%</span>
            </span>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
              <span
                className="inline-block relative rounded-full"
                style={{ width: 30, height: 3, background: 'var(--line)' }}
                aria-hidden
              >
                <span
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${ctxPercent}%`, background: 'var(--accent)' }}
                />
              </span>
              {Math.round(contextUsage.used / 100) / 10}k
            </span>
          </div>
        )}
        <div className="flex justify-between" style={{ padding: '2px 0' }}>
          <span>today</span>
          <span style={{ color: 'var(--ink)' }}>{todayCost}</span>
        </div>
        <div
          className="flex items-center gap-1.5"
          style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}
        >
          <span
            className="liminal-breathe"
            style={{
              width: 6, height: 6, borderRadius: 99,
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
            }}
          />
          <span className="flex-1" style={{ color: 'var(--ink)' }}>listening</span>
          {version && (
            <span
              className="font-mono"
              style={{
                fontSize: 9.5,
                letterSpacing: 0.4,
                color: 'var(--ink-faint)',
                marginRight: 4,
              }}
              title={`daimon ${version}`}
            >
              v{version}
            </span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="cursor-pointer"
            style={{ color: 'var(--ink-muted)', padding: 2, fontSize: 12 }}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="cursor-pointer"
            style={{ color: 'var(--ink-muted)', padding: 2, fontSize: 12 }}
            title="Log out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
