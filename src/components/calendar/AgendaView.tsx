'use client'

import { Calendar, ChevronRight, MapPin, Repeat, Video } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CalendarEvent } from './types'
import { formatDateRange } from './utils'

interface AgendaViewProps {
  eventsByDate: Map<string, CalendarEvent[]>
  todayKey: string
  isMultiUser: boolean
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
  setSelectedDayKey: (key: string) => void
  setMobileView: (view: 'calendar' | 'agenda' | 'day') => void
}

export function AgendaView({
  eventsByDate,
  todayKey,
  isMultiUser,
  getEventColor,
  setSelectedEvent,
  setSelectedDayKey,
  setMobileView,
}: AgendaViewProps) {
  const sortedDates = Array.from(eventsByDate.keys()).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="md:hidden space-y-2">
        <EmptyState
          icon={Calendar}
          title="Nessun evento"
          description="Non ci sono eventi questo mese. Tocca + per crearne uno."
        />
      </div>
    )
  }

  return (
    <div className="md:hidden space-y-2">
      {sortedDates.map((dateKey) => {
        const dayEvents = eventsByDate.get(dateKey) || []
        const d = new Date(dateKey + 'T00:00:00')
        const isToday = dateKey === todayKey
        return (
          <div key={dateKey}>
            <button
              onClick={() => { setSelectedDayKey(dateKey); setMobileView('day') }}
              className={`sticky top-0 z-10 w-full text-left px-3 py-1.5 text-xs font-semibold rounded-md mb-1 flex items-center justify-between group ${
                isToday ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted'
              }`}
            >
              <span>
                {isToday && 'Oggi — '}
                {d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
            <div className="space-y-1.5 mb-3">
              {dayEvents.map((ev) => {
                const color = getEventColor(ev)
                const isAllDay = !!ev.start.date
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="w-full text-left rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3 active:bg-secondary/30 transition-all touch-manipulation shadow-sm hover:shadow-md"
                  >
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.summary}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {isAllDay ? 'Tutto il giorno' : formatDateRange(ev.start, ev.end)}
                      </p>
                      {isMultiUser && ev._ownerName && (
                        <p className="text-xs mt-0.5 font-medium" style={{ color }}>
                          {ev._ownerName}
                        </p>
                      )}
                      {ev.location && (
                        <p className="text-xs text-muted truncate mt-0.5">
                          <MapPin className="inline h-3 w-3 mr-0.5" />{ev.location}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ev.recurringEventId && (
                        <span title="Evento ricorrente"><Repeat className="h-3.5 w-3.5 text-muted" /></span>
                      )}
                      {ev.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video') && (
                        <Video className="h-4 w-4 text-indigo-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
