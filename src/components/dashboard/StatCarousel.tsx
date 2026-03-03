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
      <div className="md:hidden flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 mb-6 snap-x snap-mandatory">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="relative overflow-hidden rounded-2xl bg-card border border-border/25 p-3.5 cursor-pointer active:scale-[0.96] active:opacity-80 transition-all touch-manipulation min-w-[130px] flex-shrink-0 snap-start shadow-[var(--shadow-sm)]"
          >
            <div className={`flex flex-col gap-2.5 ${stat.color}`}>
              <div className="p-1.5 rounded-[10px] w-fit" style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[22px] font-bold tracking-tight truncate tabular-nums leading-none text-foreground">{stat.value}</p>
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
            className="relative overflow-hidden rounded-2xl border border-border/25 bg-card p-5 cursor-pointer hover:shadow-[var(--shadow-md)] hover:border-border/40 transition-all duration-200 group touch-manipulation active:scale-[0.98]"
          >
            <div className={`flex items-start justify-between gap-3 ${stat.color}`}>
              <div className="min-w-0">
                <p className="text-[11px] text-muted font-medium truncate leading-tight mb-2">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight truncate tabular-nums leading-none text-foreground">{stat.value}</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ background: `color-mix(in srgb, currentColor 8%, transparent)` }}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
