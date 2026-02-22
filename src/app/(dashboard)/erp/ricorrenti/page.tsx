'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Landmark, RefreshCw, FileCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

const AbbonamentiContent = dynamic(() => import('@/components/erp/ricorrenti/AbbonamentiContent').then(m => ({ default: m.AbbonamentiContent })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})
const FattureRicorrentiContent = dynamic(() => import('@/components/erp/ricorrenti/FattureRicorrentiContent').then(m => ({ default: m.FattureRicorrentiContent })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})

const TABS = [
  { key: 'abbonamenti', label: 'Abbonamenti', icon: RefreshCw },
  { key: 'fatture', label: 'Fatture Ricorrenti', icon: FileCheck },
] as const

type TabKey = typeof TABS[number]['key']

function RicorrentiContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as TabKey) || 'abbonamenti'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Ricorrenti</h1>
          <p className="text-xs md:text-sm text-muted">Abbonamenti e fatture ricorrenti</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-card rounded-lg border border-border mb-6 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => router.push(`/erp/ricorrenti${key === 'abbonamenti' ? '' : `?tab=${key}`}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

      {activeTab === 'abbonamenti' && <AbbonamentiContent />}
      {activeTab === 'fatture' && <FattureRicorrentiContent />}
    </div>
  )
}

export default function RicorrentiPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <RicorrentiContent />
    </Suspense>
  )
}
