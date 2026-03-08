'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- handlers in render */

import { useRouter } from 'next/navigation'
import type { QuickActionDefinition } from '@/lib/dashboard-profiles'

interface DashboardQuickActionsProps {
  actions?: QuickActionDefinition[]
}

export function DashboardQuickActions({ actions }: DashboardQuickActionsProps) {
  const router = useRouter()

  if (!actions || actions.length === 0) return null

  return (
    <div className="mb-6 md:mb-7 lg:mb-8">
      {/* Mobile: iOS-style quick actions */}
      <div className="md:hidden flex justify-around px-1 mb-0">
        {actions.slice(0, 4).map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => router.push(action.href)}
              className="ios-press flex flex-col items-center gap-1.5 touch-manipulation"
            >
              <div className={`w-[52px] h-[52px] rounded-[14px] ${action.bg} ${action.color} flex items-center justify-center`}>
                <Icon className="h-[22px] w-[22px]" />
              </div>
              <span className="text-xs font-medium text-muted leading-tight text-center max-w-[64px]">
                {action.description}
              </span>
            </button>
          )
        })}
      </div>
      {/* Desktop: full grid */}
      <div className={`hidden md:grid gap-3 ${actions.length <= 3 ? 'md:grid-cols-3' : actions.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-5'}`}>
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
