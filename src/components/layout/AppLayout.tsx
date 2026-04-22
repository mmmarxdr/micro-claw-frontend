import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { LiminalSidebar } from '../liminal/LiminalSidebar'
import { LiminalCmd } from '../liminal/LiminalCmd'
import { useTheme } from '../../contexts/ThemeContext'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const { toggleTheme } = useTheme()

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
    <div className="flex min-h-dvh bg-paper">
      <LiminalSidebar
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSummon={() => setCmdOpen(true)}
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
        className="flex-1 overflow-y-auto min-w-0 h-dvh md:h-auto"
        style={{ background: 'var(--bg)' }}
      >
        <Outlet />
      </main>

      <LiminalCmd
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onToggleTheme={toggleTheme}
      />
    </div>
  )
}
