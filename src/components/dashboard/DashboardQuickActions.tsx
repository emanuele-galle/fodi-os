'use client'

import { useRouter } from 'next/navigation'
import {
  UserPlus, FolderKanban, FilePlus2, TicketPlus, ClockPlus,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { label: 'Nuovo Cliente', description: 'Aggiungi cliente', icon: UserPlus, href: '/crm', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
  { label: 'Nuovo Progetto', description: 'Crea progetto', icon: FolderKanban, href: '/projects', color: 'text-accent', bg: 'bg-accent/10', hoverBorder: 'hover:border-accent/30' },
  { label: 'Nuovo Preventivo', description: 'Crea preventivo', icon: FilePlus2, href: '/erp/quotes/new', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10', hoverBorder: 'hover:border-[var(--color-warning)]/30' },
  { label: 'Nuovo Ticket', description: 'Apri ticket', icon: TicketPlus, href: '/support', color: 'text-destructive', bg: 'bg-destructive/10', hoverBorder: 'hover:border-destructive/30' },
  { label: 'Registra Ore', description: 'Traccia tempo', icon: ClockPlus, href: '/time', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
]

export function DashboardQuickActions() {
  const router = useRouter()

  return (
    <div className="mb-6 md:mb-8">
      {/* Mobile: compact circular layout (first 4 actions) */}
      <div className="md:hidden flex justify-around px-2 mb-0">
        {QUICK_ACTIONS.slice(0, 4).map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform touch-manipulation"
            >
              <div className={`w-12 h-12 rounded-full ${action.bg} ${action.color} flex items-center justify-center shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium text-muted leading-tight text-center max-w-[64px]">
                {action.description}
              </span>
            </button>
          )
        })}
      </div>
      {/* Desktop: full grid */}
      <div className="hidden md:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className={`group relative flex flex-col items-center gap-2 p-5 rounded-xl border border-border/30 ${action.hoverBorder} bg-card hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.97]`}
            >
              <div className={`p-3 rounded-xl ${action.bg} ${action.color} transition-transform duration-200 group-hover:scale-110`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold leading-tight">{action.label}</p>
                <p className="text-xs text-muted mt-0.5">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
