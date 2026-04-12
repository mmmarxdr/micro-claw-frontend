import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart2,
  MessageSquare,
  Brain,
  Bot,
  Wrench,
  Settings,
  ScrollText,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useSidebar } from '../../contexts/SidebarContext'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/',              label: 'Overview',      icon: LayoutDashboard },
  { to: '/metrics',       label: 'Metrics',       icon: BarChart2 },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/memory',        label: 'Memory',        icon: Brain },
  { to: '/chat',          label: 'Chat',          icon: Bot },
  { to: '/tools',         label: 'Tools',         icon: Wrench },
  { to: '/settings',      label: 'Settings',      icon: Settings },
  { to: '/logs',          label: 'Logs',          icon: ScrollText },
]

interface SidebarProps {
  drawerOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ drawerOpen = false, onClose }: SidebarProps) {
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        // Base layout
        'bg-surface border-r border-border flex flex-col shrink-0',
        // Transition for width + slide animation
        'transition-[width,transform] duration-200 ease-in-out',
        // Mobile: fixed overlay, slide in/out
        'fixed inset-y-0 left-0 z-50',
        'md:relative md:inset-auto md:z-auto',
        // Translate: mobile shows/hides via drawer; md+ always visible
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
        // Width based on state
        drawerOpen ? 'w-60' : '',
        !drawerOpen && collapsed ? 'w-14' : '',
        !drawerOpen && !collapsed ? 'w-60' : '',
      )}
    >
      {/* Brand / logo */}
      <div className={cn(
        'flex items-center',
        collapsed && !drawerOpen ? 'px-2 py-5 justify-center' : 'px-4 py-5'
      )}>
        {collapsed && !drawerOpen ? (
          <span className="text-[15px] font-semibold text-text-primary">M</span>
        ) : (
          <span className="text-[15px] font-semibold text-text-primary">MicroAgent</span>
        )}
        {/* Close button — only in overlay/drawer mode */}
        {drawerOpen && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto flex items-center justify-center h-7 w-7 rounded-md text-text-secondary hover:bg-hover-surface hover:text-text-primary transition-colors"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed && !drawerOpen ? label : undefined}
            onClick={drawerOpen ? onClose : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center h-9 rounded-md text-[14px] font-medium transition-colors',
                collapsed && !drawerOpen
                  ? 'justify-center px-0'
                  : 'gap-3 px-3',
                isActive
                  ? 'bg-accent-light text-accent border-l-2 border-l-accent'
                  : 'text-text-secondary hover:bg-hover-surface hover:text-text-primary',
                isActive && !(collapsed && !drawerOpen) ? 'pl-[10px]' : '',
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {!(collapsed && !drawerOpen) && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: collapse toggle */}
      <div className={cn(
        'shrink-0 border-t border-border p-2 flex',
        collapsed && !drawerOpen ? 'flex-col items-center gap-1' : 'items-center gap-1'
      )}>
        {/* Collapse toggle — hidden in overlay/drawer mode, hidden below md */}
        {!drawerOpen && (
          <button
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex items-center justify-center h-9 w-9 rounded-md text-text-secondary hover:bg-hover-surface hover:text-text-primary transition-colors"
          >
            {collapsed
              ? <PanelLeftOpen size={16} strokeWidth={1.75} />
              : <PanelLeftClose size={16} strokeWidth={1.75} />
            }
          </button>
        )}
      </div>
    </aside>
  )
}
