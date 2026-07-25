import { NavLink, Outlet } from 'react-router-dom'
import {
  Camera,
  Droplets,
  FolderKanban,
  History,
  Pipette,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs: Array<{
  to: string
  label: string
  icon: typeof Pipette
  end?: boolean
}> = [
  { to: '/', label: 'Match', icon: Pipette, end: true },
  { to: '/live', label: 'Live', icon: Camera },
  { to: '/palettes', label: 'Palettes', icon: Droplets },
  { to: '/history', label: 'History', icon: History },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
]

export function AppShell() {
  return (
    <div className="mx-auto flex h-full min-h-full w-full max-w-lg flex-col md:max-w-3xl lg:max-w-5xl">
      <header className="safe-x sticky top-0 z-40 border-b border-white/5 bg-[#0b0f14]/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Local · Offline
            </p>
            <h1 className="text-display text-3xl leading-none text-[var(--color-foreground)] md:text-4xl">
              Paint Match AI
            </h1>
          </div>
          <NavLink
            to="/settings"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[var(--color-muted)] hover:text-white"
          >
            Settings
          </NavLink>
        </div>
      </header>

      <main className="safe-x safe-bottom flex-1 px-4 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0b0f14]/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 md:max-w-3xl lg:max-w-5xl">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide transition-colors',
                  isActive
                    ? 'bg-white/10 text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:text-white',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
