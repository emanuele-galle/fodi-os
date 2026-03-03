'use client'
/* eslint-disable react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-function-as-prop -- framer-motion animation objects */

import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatCard {
  label: string
  value: string
  icon: React.ElementType
  color: string
  href: string
}

interface StatCarouselProps {
  stats: StatCard[]
  loading: boolean
}

export function StatCarousel({ stats, loading }: StatCarouselProps) {
  const router = useRouter()

  const count = stats.length
  // Adapt grid columns to stat count: 2→2, 3→3, 4→4, 5→5, 6→6
  const desktopGridCols = count <= 2 ? 'md:grid-cols-2' : count === 3 ? 'md:grid-cols-3' : count === 4 ? 'md:grid-cols-4' : count === 5 ? 'md:grid-cols-5' : 'md:grid-cols-3 lg:grid-cols-6'

  if (loading) {
    return (
      <div className={`grid grid-cols-2 ${desktopGridCols} gap-3 md:gap-4 mb-6`}>
        {Array.from({ length: count || 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] md:h-[100px] rounded-xl" />)}
      </div>
    )
  }

  return (
    <>
      {/* Mobile: horizontal scrollable */}
      <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 mb-6 snap-x snap-mandatory">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-3 cursor-pointer active:scale-[0.97] transition-all touch-manipulation min-w-[140px] flex-shrink-0 snap-start"
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl opacity-80" style={{ background: 'currentColor' }} />
            <div className={`flex flex-col gap-2 ${stat.color}`}>
              <div className="p-1.5 rounded-lg w-fit" style={{ background: `color-mix(in srgb, currentColor 8%, transparent)` }}>
                <stat.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight truncate tabular-nums leading-none text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted font-medium truncate leading-tight mt-1">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop: grid adapts to stat count */}
      <div className={`hidden md:grid ${desktopGridCols} gap-4 mb-6 animate-stagger`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="relative overflow-hidden rounded-2xl border border-border/25 bg-card p-5 cursor-pointer hover:shadow-[var(--shadow-md)] hover:border-border/50 transition-all duration-200 group touch-manipulation active:scale-[0.98]"
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl opacity-80" style={{ background: 'currentColor' }} />
            <div className={`flex flex-col gap-3 ${stat.color}`}>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: `color-mix(in srgb, currentColor 8%, transparent)` }}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight truncate tabular-nums leading-none text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted font-medium truncate leading-tight mt-1.5">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
