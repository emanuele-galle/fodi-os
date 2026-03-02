'use client'

import { useRouter } from 'next/navigation'
import type { QuickActionDefinition } from '@/lib/dashboard-profiles'

interface DashboardQuickActionsProps {
  actions?: QuickActionDefinition[]
}

export function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
  const router = useRouter()

  if (!actions || actions.length === 0) return null

  return (
    <div className="mb-6 md:mb-8">
      {/* Mobile: compact circular layout (first 4 actions) */}
      <div className="md:hidden flex justify-around px-2 mb-0">
        {actions.slice(0, 4).map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
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
      <div className={`hidden md:grid gap-3 ${actions.length <= 3 ? 'sm:grid-cols-3' : actions.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-5'}`}>
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => router.push(action.href)}
              className={`group relative flex flex-col items-center gap-2 p-5 rounded-2xl border border-border/30 ${action.hoverBorder} bg-card hover:shadow-[var(--shadow-md)] transition-all duration-200 cursor-pointer active:scale-[0.97]`}
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
