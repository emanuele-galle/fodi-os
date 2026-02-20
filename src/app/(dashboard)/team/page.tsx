'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { UsersRound, Clock, Activity, FileText } from 'lucide-react'
import { Suspense } from 'react'
import { TeamMembersContent } from '@/components/team/TeamMembersContent'
import { TimeTrackingContent } from '@/components/team/TimeTrackingContent'
import { TeamActivityContent } from '@/components/team/TeamActivityContent'
import { TeamReportsContent } from '@/components/team/TeamReportsContent'

const TABS = [
  { id: 'members', label: 'Membri', icon: UsersRound },
  { id: 'attendance', label: 'Presenze', icon: Clock },
  { id: 'activity', label: 'Attivita', icon: Activity },
  { id: 'reports', label: 'Report', icon: FileText },
] as const

type TabId = (typeof TABS)[number]['id']

function TeamPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get('tab') as TabId) || 'members'

  function setTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'members') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.push(`/team${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UsersRound className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Team</h1>
          <p className="text-xs md:text-sm text-muted">Gestione team, presenze e attivita</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'members' && <TeamMembersContent />}
      {activeTab === 'attendance' && <TimeTrackingContent />}
      {activeTab === 'activity' && <TeamActivityContent />}
      {activeTab === 'reports' && <TeamReportsContent />}
    </div>
  )
}

export default function TeamPage() {
  return (
    <Suspense>
      <TeamPageContent />
    </Suspense>
  )
}
