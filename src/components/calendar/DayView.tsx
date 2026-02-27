'use client'

import { ChevronLeft, ChevronRight, Plus, Calendar, MapPin, Video } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import type { CalendarEvent, MobileView, NewEventData } from './types'
import { HOURS, SLOT_HEIGHT } from './constants'
import { formatTime, addHour, getEventPositionStyle } from './utils'

interface DayViewProps {
  selectedDayKey: string
  setSelectedDayKey: (key: string) => void
  setYear: (y: number) => void
  setMonth: (m: number) => void
  todayKey: string
  eventsByDate: Map<string, CalendarEvent[]>
  isMultiUser: boolean
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
  openNewEventForDate: (dateStr: string) => void
  setNewEvent: (ev: NewEventData) => void
  setCreateError: (err: string | null) => void
  setShowNewEvent: (show: boolean) => void
  mobileView: MobileView
}

export function DayView({
  selectedDayKey,
  setSelectedDayKey,
  setYear,
  setMonth,
  todayKey,
  eventsByDate,
  isMultiUser,
  getEventColor,
  setSelectedEvent,
  openNewEventForDate,
  setNewEvent,
  setCreateError,
  setShowNewEvent,
  mobileView,
}: DayViewProps) {
  const selDayEvents = eventsByDate.get(selectedDayKey) || []
  const allDayEvs = selDayEvents.filter((ev) => !!ev.start.date)
  const timedEvs = selDayEvents.filter((ev) => !!ev.start.dateTime)
  const selDate = new Date(selectedDayKey + 'T00:00:00')
  const isToday = selectedDayKey === todayKey

  const goPrevDay = () => {
    const d = new Date(selectedDayKey + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDayKey(d.toISOString().split('T')[0])
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }
  const goNextDay = () => {
    const d = new Date(selectedDayKey + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDayKey(d.toISOString().split('T')[0])
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <Card className={`overflow-hidden ${mobileView === 'day' ? '' : 'hidden md:block'}`}>
      <CardContent className="p-0">
        {/* Day header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/10">
          <button onClick={goPrevDay} className="p-2 md:p-1.5 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <div className={`text-lg font-bold capitalize ${isToday ? 'text-primary' : ''}`}>
              {selDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              {isToday && <span className="ml-2 text-xs font-normal bg-primary text-primary-foreground rounded-full px-2 py-0.5">Oggi</span>}
            </div>
            <div className="text-xs text-muted mt-0.5">{selDayEvents.length} eventi</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openNewEventForDate(selectedDayKey)}
              className="p-2 md:p-1.5 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation"
              title="Nuovo evento"
            >
              <Plus className="h-4 w-4 text-primary" />
            </button>
            <button onClick={goNextDay} className="p-2 md:p-1.5 rounded-lg hover:bg-secondary/50 transition-colors touch-manipulation">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* All-day events */}
        {allDayEvs.length > 0 && (
          <div className="px-3 py-2 border-b border-border bg-secondary/5 space-y-1">
            <p className="text-[10px] text-muted font-medium uppercase tracking-wide mb-1">Tutto il giorno</p>
            {allDayEvs.map((ev) => {
              const color = getEventColor(ev)
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full text-left rounded-md px-2.5 py-1.5 text-xs border-l-2 font-medium"
                  style={{ borderLeftColor: color, backgroundColor: color + '15', color }}
                >
                  {ev.summary}
                  {isMultiUser && ev._ownerName && <span className="ml-2 font-normal opacity-70">— {ev._ownerName}</span>}
                </button>
              )
            })}
          </div>
        )}
        {/* Time grid */}
        <div className="overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[650px]">
          <div className="relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
            {/* Hour lines + labels */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-border/30 flex items-start hover:bg-secondary/15 transition-colors cursor-pointer group"
                style={{ top: hour * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                onClick={() => {
                  const timeStr = `${String(hour).padStart(2, '0')}:00`
                  setNewEvent({
                    summary: '', description: '', location: '',
                    startDate: selectedDayKey, startTime: timeStr,
                    endDate: selectedDayKey, endTime: addHour(timeStr),
                    withMeet: false,
                  })
                  setCreateError(null)
                  setShowNewEvent(true)
                }}
              >
                <span className="text-[10px] text-muted w-14 text-right pr-3 pt-1 flex-shrink-0 select-none">
                  {`${String(hour).padStart(2, '0')}:00`}
                </span>
                <div className="flex-1 border-l border-border/20 h-full" />
              </div>
            ))}
            {/* Events - absolute positioned */}
            {timedEvs.map((ev) => {
              const pos = getEventPositionStyle(ev, SLOT_HEIGHT)
              if (!pos) return null
              const color = getEventColor(ev)
              const durationMins = (new Date(ev.end.dateTime!).getTime() - new Date(ev.start.dateTime!).getTime()) / 60000
              return (
                <button
                  key={ev.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                  className="absolute rounded-lg text-left px-2.5 py-1.5 border-l-[3px] overflow-hidden hover:shadow-lg transition-all hover:z-20 hover:scale-[1.01]"
                  style={{
                    top: pos.top + 1,
                    height: Math.max(pos.height - 2, 24),
                    left: 60,
                    right: 8,
                    borderLeftColor: color,
                    backgroundColor: color + '20',
                    zIndex: 5,
                  }}
                >
                  <div className="font-semibold text-xs truncate" style={{ color }}>
                    {formatTime(ev.start.dateTime)} — {formatTime(ev.end.dateTime)}
                    {ev.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video') && (
                      <Video className="inline h-3 w-3 ml-1.5" />
                    )}
                  </div>
                  {pos.height > 35 && (
                    <div className="text-xs truncate mt-0.5 font-medium text-foreground/80">{ev.summary}</div>
                  )}
                  {pos.height > 55 && ev.location && (
                    <div className="text-[10px] text-muted truncate mt-0.5">
                      <MapPin className="inline h-2.5 w-2.5 mr-0.5" />{ev.location}
                    </div>
                  )}
                  {pos.height > 55 && isMultiUser && ev._ownerName && (
                    <div className="text-[10px] truncate mt-0.5" style={{ color }}>— {ev._ownerName}</div>
                  )}
                  {durationMins < 30 && (
                    <span className="sr-only">{ev.summary}</span>
                  )}
                </button>
              )
            })}
            {/* Current time line */}
            {isToday && (() => {
              const now = new Date()
              const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * SLOT_HEIGHT
              return (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  style={{ top: nowTop }}
                >
                  <div className="w-14 pr-1 text-right">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 ml-auto" />
                  </div>
                  <div className="flex-1 h-[2px] bg-red-500 opacity-80" />
                </div>
              )
            })()}
            {/* Empty state */}
            {timedEvs.length === 0 && allDayEvs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-muted/30 mx-auto mb-2" />
                  <p className="text-sm text-muted">Nessun evento per questo giorno</p>
                  <p className="text-xs text-muted/70 mt-1">Tocca un orario per aggiungere un evento</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
