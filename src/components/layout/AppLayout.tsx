import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { SidebarProvider } from '../../contexts/SidebarContext'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {/* Desktop/tablet sidebar — hidden below md via Sidebar's own logic */}
        <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* Overlay backdrop — only rendered on mobile when drawer is open */}
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 bg-background overflow-y-auto min-w-0">
          {/* Hamburger button — only visible below md */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="flex md:hidden items-center justify-center h-9 w-9 m-2 rounded-md text-text-secondary hover:bg-hover-surface hover:text-text-primary transition-colors"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
