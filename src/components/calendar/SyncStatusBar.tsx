'use client'

import { RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { CalendarInfo } from './types'

interface SyncStatusBarProps {
  syncStatus: 'ok' | 'error' | 'scopes' | null
  lastSyncTime: Date | null
  scopeError: boolean
  fetchError: string | null
  brandCalendarId: string | null
  calendars: CalendarInfo[]
  fetchEvents: () => void
}

export function SyncStatusBar({
  syncStatus,
  lastSyncTime,
  scopeError,
  fetchError,
  brandCalendarId,
  calendars,
  fetchEvents,
}: SyncStatusBarProps) {
  return (
    <>
      {/* Active calendar indicator */}
      {brandCalendarId && calendars.length > 0 && (() => {
        const activeCal = calendars.find((c) => c.id === brandCalendarId)
        return activeCal ? (
          <div className="flex items-center gap-2 mb-4 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCal.backgroundColor }} />
            <span className="text-muted font-medium">{activeCal.summary}</span>
          </div>
        ) : null
      })()}

      {/* Sync status badge */}
      {syncStatus && !scopeError && (
        <div className={`mb-3 flex items-center gap-2 text-xs ${syncStatus === 'ok' ? 'text-emerald-600' : 'text-amber-600'}`}>
          <RefreshCw className={`h-3 w-3 ${syncStatus === 'ok' ? '' : 'animate-spin'}`} />
          <span>
            {syncStatus === 'ok' ? 'Sincronizzazione attiva' : 'Errore sincronizzazione'}
            {lastSyncTime && syncStatus === 'ok' && (
              <> &middot; {lastSyncTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </span>
        </div>
      )}

      {/* Scope error banner */}
      {scopeError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">Permessi Google Calendar insufficienti. Riconnetti per ripristinare la sincronizzazione.</p>
          </div>
          <Button size="sm" variant="outline" className="flex-shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => window.location.href = '/api/auth/google'}>Riconnetti Google</Button>
        </div>
      )}

      {/* Fetch error banner */}
      {fetchError && !scopeError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchEvents()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}
    </>
  )
}
