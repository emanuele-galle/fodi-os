'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, X, MapPin } from 'lucide-react'
import type { CalendarEvent } from './types'
import { formatTime } from './utils'

interface EventSearchProps {
  eventsByDate: Map<string, CalendarEvent[]>
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
}

export function EventSearch({ eventsByDate, getEventColor, setSelectedEvent }: EventSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), [])
  const handleClose = useCallback(() => { setQuery(''); setOpen(false) }, [])

  const results = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const matches: { dateKey: string; event: CalendarEvent }[] = []

    for (const [dateKey, events] of eventsByDate) {
      for (const ev of events) {
        if (
          ev.summary?.toLowerCase().includes(q) ||
          ev.location?.toLowerCase().includes(q) ||
          ev._ownerName?.toLowerCase().includes(q) ||
          ev.description?.toLowerCase().includes(q)
        ) {
          matches.push({ dateKey, event: ev })
        }
      }
    }

    // Deduplicate by event id
    const seen = new Set<string>()
    return matches.filter((m) => {
      if (seen.has(m.event.id)) return false
      seen.add(m.event.id)
      return true
    }).slice(0, 10)
  }, [query, eventsByDate])

  const handleResultClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.dataset.eventId
    const match = results.find(r => r.event.id === id)
    if (match) { setSelectedEvent(match.event); setQuery(''); setOpen(false) }
  }, [results, setSelectedEvent])

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
        title="Cerca eventi"
      >
        <Search className="h-4 w-4 text-muted" />
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1 border border-border rounded-lg bg-card px-2 py-1">
        <Search className="h-3.5 w-3.5 text-muted flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Cerca eventi..."
          className="text-sm bg-transparent border-none outline-none w-32 sm:w-48"
          autoFocus
        />
        <button onClick={handleClose} className="p-0.5">
          <X className="h-3.5 w-3.5 text-muted" />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-1 right-0 w-72 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map(({ dateKey, event }) => {
            const color = getEventColor(event)
            const d = new Date(dateKey + 'T00:00:00')
            return (
              <button
                key={event.id}
                data-event-id={event.id}
                onClick={handleResultClick}
                className="w-full text-left px-3 py-2 hover:bg-secondary/30 transition-colors border-b border-border/30 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic color */}
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium truncate">{event.summary}</span>
                </div>
                <div className="text-xs text-muted mt-0.5 pl-3.5">
                  {d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  {event.start.dateTime && ` ${formatTime(event.start.dateTime)}`}
                  {event.location && (
                    <span className="ml-1"><MapPin className="inline h-2.5 w-2.5" /> {event.location}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
