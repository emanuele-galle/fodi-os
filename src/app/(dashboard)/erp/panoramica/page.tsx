'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Landmark, BarChart3, Calendar, CalendarRange } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

const MonthlyDashboard = dynamic(() => import('@/components/erp/dashboard/MonthlyDashboard').then(m => ({ default: m.MonthlyDashboard })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})
const AnnualDashboard = dynamic(() => import('@/components/erp/dashboard/AnnualDashboard').then(m => ({ default: m.AnnualDashboard })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})
const StatisticsDashboard = dynamic(() => import('@/components/erp/dashboard/StatisticsDashboard').then(m => ({ default: m.StatisticsDashboard })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})

const TABS = [
  { key: 'mensile', label: 'Mensile', icon: Calendar },
  { key: 'annuale', label: 'Annuale', icon: CalendarRange },
  { key: 'statistiche', label: 'Statistiche', icon: BarChart3 },
] as const

type TabKey = typeof TABS[number]['key']

function PanoramicaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as TabKey) || 'mensile'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Panoramica</h1>
          <p className="text-xs md:text-sm text-muted">Dashboard finanziaria</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-card rounded-lg border border-border mb-6 w-fit max-w-full overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => router.push(`/erp/panoramica${key === 'mensile' ? '' : `?tab=${key}`}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'mensile' && <MonthlyDashboard />}
      {activeTab === 'annuale' && <AnnualDashboard />}
      {activeTab === 'statistiche' && <StatisticsDashboard />}
    </div>
  )
}

export default function PanoramicaPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <PanoramicaContent />
    </Suspense>
  )
}
