import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { LiminalSidebar } from '../liminal/LiminalSidebar'
import { LiminalCmd } from '../liminal/LiminalCmd'
import { useTheme } from '../../contexts/ThemeContext'
import { useConfig, useMetrics, useStatus } from '../../hooks/useApi'
import { formatUSD } from '../../lib/format'
import { ChatPage, type ChatPageMode } from '../../pages/ChatPage'
import { getDockClosed, setDockClosed, subscribeDockClosed } from '../../lib/chatDockStorage'

// Subset of config consumed by the sidebar footer. The full config has
// many other fields; we narrow here so the sidebar wiring is explicit.
interface SidebarConfig {
  agent?: { max_context_tokens?: number }
  models?: { default?: { provider?: string; model?: string } }
  // Legacy single-provider shape some older configs still use.
  provider?: { model?: string; type?: string }
}

// shortenModel collapses provider-prefixed model IDs ("moonshotai/kimi-k2.6")
// into the human-readable suffix ("kimi-k2.6") so the sidebar footer doesn't
// wrap or truncate awkwardly. Vendor-less IDs pass through unchanged.
function shortenModel(id: string): string {
  if (!id) return '—'
  const slash = id.lastIndexOf('/')
  if (slash >= 0 && slash < id.length - 1) return id.slice(slash + 1)
  return id
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const { toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  // Floating chat dock — ChatPage is mounted once below, in the always-visible
  // <main>. The `mode` prop controls what gets rendered (fullscreen on /chat,
  // dock on every other route, hidden when the user dismissed the dock). The
  // dismissal persists across reloads so the dock stays out of the way.
  //
  // localStorage is the source of truth (read via useSyncExternalStore so any
  // write — same-tab or cross-tab — re-renders the layout). Coming back to
  // /chat clears the flag so the next exit shows the dock again.
  const dockClosed = useSyncExternalStore(subscribeDockClosed, getDockClosed, () => false)
  const isOnChatRoute = location.pathname === '/chat'

  useEffect(() => {
    if (isOnChatRoute && dockClosed) {
      setDockClosed(false)
    }
  }, [isOnChatRoute, dockClosed])

  const chatMode: ChatPageMode = isOnChatRoute
    ? 'fullscreen'
    : dockClosed
      ? 'hidden'
      : 'dock'

  // Sidebar footer telemetry. All best-effort — failures collapse to the
  // "—" placeholders that LiminalSidebar already renders.
  const { data: rawConfig } = useConfig()
  const { data: metrics } = useMetrics()
  const { data: status } = useStatus()
  const cfg = rawConfig as SidebarConfig | undefined

  const modelLabel = useMemo(() => {
    const id = cfg?.models?.default?.model ?? cfg?.provider?.model ?? ''
    return shortenModel(id)
  }, [cfg])

  const todayCost = metrics ? formatUSD(metrics.today.cost_usd) : '—'

  // Context usage = input_tokens of the LAST LLM call vs the model's true
  // context window (fetched from the provider — e.g. 1M for deepseek-v4-pro,
  // 200k for kimi). The agent's `max_context_tokens` config is a soft cap
  // for compaction, not the model's capacity, so using it as denominator
  // shows a near-full bar for long-context models and that's misleading.
  //
  // Falls back to the agent's max_context_tokens when the model's context
  // window isn't known (e.g. provider has no ListModels). Hidden entirely
  // when there's no last call yet.
  const contextUsage = useMemo(() => {
    const used = metrics?.today.last_call_input_tokens ?? 0
    if (used <= 0) return undefined
    const modelLen = metrics?.today.last_call_context_length ?? 0
    const fallback = cfg?.agent?.max_context_tokens ?? 0
    const total = modelLen > 0 ? modelLen : fallback
    if (total <= 0) return undefined
    return { used, total }
  }, [cfg, metrics])

  // Global ⌘K / Ctrl K — open command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    // h-dvh + overflow-hidden pins the layout to the viewport so the sidebar
    // (a flex child on desktop) can't be stretched by tall page content. The
    // <main> below scrolls internally instead. Without this, /conversations
    // and other long pages push the sidebar's footer below the fold.
    <div className="flex h-dvh overflow-hidden bg-paper">
      <LiminalSidebar
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSummon={() => setCmdOpen(true)}
        modelLabel={modelLabel}
        contextUsage={contextUsage}
        todayCost={todayCost}
        version={status?.version}
      />

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        className="md:hidden fixed top-2 left-2 z-50 flex items-center justify-center h-9 w-9 rounded-md transition-colors"
        style={{ color: 'var(--ink-muted)', background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <main
        className="flex-1 overflow-y-auto min-w-0 h-dvh"
        style={{ background: 'var(--bg)' }}
      >
        {/*
          Children list shape MUST stay stable across route changes — if it
          shrinks (e.g. <Outlet /> conditionally not rendered on /chat),
          React's positional child reconciliation re-anchors siblings and
          ChatPage gets unmounted and remounted, wiping `messages` state and
          the WebSocket. App.tsx renders /chat with element={null}, so the
          Outlet here is a harmless no-op on /chat — keep it unconditional.
        */}
        <Outlet />
        <ChatPage
          mode={chatMode}
          onDockClose={() => setDockClosed(true)}
          onDockExpand={() => navigate('/chat')}
        />
      </main>

      <LiminalCmd
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onToggleTheme={toggleTheme}
      />
    </div>
  )
}
