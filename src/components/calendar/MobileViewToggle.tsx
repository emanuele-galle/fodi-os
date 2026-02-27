'use client'

import { Users } from 'lucide-react'
import type { MobileView } from './types'

interface MobileViewToggleProps {
  mobileView: MobileView
  setMobileView: (view: MobileView) => void
  todayKey: string
  setSelectedDayKey: (key: string) => void
  canViewTeam: boolean
  isMultiUser: boolean
  selectedTeamIds: string[]
  showTeamPanel: boolean
  setShowTeamPanel: (show: boolean) => void
}

export function MobileViewToggle({
  mobileView,
  setMobileView,
  todayKey,
  setSelectedDayKey,
  canViewTeam,
  isMultiUser,
  selectedTeamIds,
  showTeamPanel,
  setShowTeamPanel,
}: MobileViewToggleProps) {
  return (
    <div className="md:hidden flex items-center gap-2 mb-4">
      {canViewTeam && (
        <button
          onClick={() => setShowTeamPanel(!showTeamPanel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            isMultiUser
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-secondary/30 text-muted'
          }`}
        >
          <Users className="h-4 w-4" />
          Team
          {isMultiUser && selectedTeamIds.length > 1 && (
            <span className="ml-0.5 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
              {selectedTeamIds.length}
            </span>
          )}
        </button>
      )}
      <div className="flex-1 flex rounded-lg border border-border bg-secondary/30 p-1">
        <button
          onClick={() => setMobileView('agenda')}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            mobileView === 'agenda' ? 'bg-card shadow-sm text-foreground' : 'text-muted'
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => { setMobileView('day'); setSelectedDayKey(todayKey) }}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            mobileView === 'day' ? 'bg-card shadow-sm text-foreground' : 'text-muted'
          }`}
        >
          Giorno
        </button>
        <button
          onClick={() => setMobileView('calendar')}
          className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
            mobileView === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted'
          }`}
        >
          Mese
        </button>
      </div>
    </div>
  )
}
