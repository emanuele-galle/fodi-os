'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Landmark, FileCode, FileSignature, Wand2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

const TemplateList = dynamic(() => import('@/components/erp/documenti/TemplateList').then(m => ({ default: m.TemplateList })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})
const FirmeList = dynamic(() => import('@/components/erp/documenti/FirmeList').then(m => ({ default: m.FirmeList })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})
const WizardList = dynamic(() => import('@/components/erp/documenti/WizardList').then(m => ({ default: m.WizardList })), {
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
})

const TABS = [
  { key: 'template', label: 'Template', icon: FileCode },
  { key: 'firme', label: 'Firme', icon: FileSignature },
  { key: 'wizard', label: 'Wizard', icon: Wand2 },
] as const

type TabKey = typeof TABS[number]['key']

function DocumentiContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as TabKey) || 'template'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Documenti</h1>
          <p className="text-xs md:text-sm text-muted">Template, firme digitali e wizard</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-card rounded-lg border border-border mb-6 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => router.push(`/erp/documenti${key === 'template' ? '' : `?tab=${key}`}`)}
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

      {activeTab === 'template' && <TemplateList />}
      {activeTab === 'firme' && <FirmeList />}
      {activeTab === 'wizard' && <WizardList />}
    </div>
  )
}

export default function DocumentiPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <DocumentiContent />
    </Suspense>
  )
}
