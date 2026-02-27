'use client'

import { Card, CardContent } from '@/components/ui/Card'
import type { CalendarEvent, NewEventData } from './types'
import { DAYS, HOURS, SLOT_HEIGHT } from './constants'
import { formatTime, addHour, getEventPositionStyle } from './utils'

interface WeekViewProps {
  weekDates: Date[]
  todayKey: string
  eventsByDate: Map<string, CalendarEvent[]>
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
  setSelectedDayKey: (key: string) => void
  setDesktopView: (view: 'month' | 'week' | 'day') => void
  setNewEvent: (ev: NewEventData) => void
  setCreateError: (err: string | null) => void
  setShowNewEvent: (show: boolean) => void
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function WeekView({
  weekDates,
  todayKey,
  eventsByDate,
  getEventColor,
  setSelectedEvent,
  setSelectedDayKey,
  setDesktopView,
  setNewEvent,
  setCreateError,
  setShowNewEvent,
}: WeekViewProps) {
  const hasAllDayEvents = weekDates.some((d) => {
    const dk = dateKey(d)
    return (eventsByDate.get(dk) || []).some((ev) => !!ev.start.date)
  })

  return (
    <Card className="hidden md:block overflow-hidden">
      <CardContent className="p-0">
        {/* All-day events row */}
        {hasAllDayEvents && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-secondary/10">
            <div className="text-[10px] text-muted px-2 py-1 text-right pt-2">tutto giorno</div>
            {weekDates.map((d, i) => {
              const dk = dateKey(d)
              const allDayEvs = (eventsByDate.get(dk) || []).filter((ev) => !!ev.start.date)
              return (
                <div key={i} className="border-l border-border/50 px-0.5 py-1 min-h-[28px]">
                  {allDayEvs.map((ev) => {
                    const color = getEventColor(ev)
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                        className="w-full text-left rounded px-1.5 py-0.5 text-[10px] truncate border-l-2 mb-0.5"
                        style={{ borderLeftColor: color, backgroundColor: color + '20', color: color }}
                      >
                        {ev.summary}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
        {/* Week header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
          <div className="py-2" />
          {weekDates.map((d, i) => {
            const dk = dateKey(d)
            const isToday = dk === todayKey
            return (
              <button
                key={i}
                onClick={() => { setSelectedDayKey(dk); setDesktopView('day') }}
                className={`py-2 text-center border-l border-border hover:bg-secondary/30 transition-colors ${
                  isToday ? 'bg-primary/5' : ''
                }`}
              >
                <div className="text-xs text-muted">{DAYS[i]}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-primary' : ''}`}>
                  {d.getDate()}
                </div>
              </button>
            )
          })}
        </div>
        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: HOURS.length * SLOT_HEIGHT }}>
            {/* Time labels column */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full text-[10px] text-muted text-right pr-2"
                  style={{ top: hour * SLOT_HEIGHT - 8, height: SLOT_HEIGHT }}
                >
                  {hour > 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDates.map((d, i) => {
              const dk = dateKey(d)
              const isToday = dk === todayKey
              const timedEvents = (eventsByDate.get(dk) || []).filter((ev) => !!ev.start.dateTime)
              return (
                <div
                  key={i}
                  className={`border-l border-border/50 relative ${isToday ? 'bg-primary/3' : ''}`}
                  style={{ height: HOURS.length * SLOT_HEIGHT }}
                >
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full border-t border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer"
                      style={{ top: hour * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      onClick={() => {
                        const timeStr = `${String(hour).padStart(2, '0')}:00`
                        setNewEvent({
                          summary: '', description: '', location: '',
                          startDate: dk, startTime: timeStr,
                          endDate: dk, endTime: addHour(timeStr),
                          withMeet: false,
                        })
                        setCreateError(null)
                        setShowNewEvent(true)
                      }}
                    />
                  ))}
                  {/* Events */}
                  {timedEvents.map((ev) => {
                    const pos = getEventPositionStyle(ev, SLOT_HEIGHT)
                    if (!pos) return null
                    const color = getEventColor(ev)
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                        className="absolute left-0.5 right-0.5 rounded text-[10px] px-1.5 py-0.5 text-left border-l-2 overflow-hidden hover:z-10 transition-all hover:shadow-md"
                        style={{
                          top: pos.top,
                          height: pos.height,
                          borderLeftColor: color,
                          backgroundColor: color + '25',
                          color: color,
                          zIndex: 1,
                        }}
                        title={`${formatTime(ev.start.dateTime)} - ${formatTime(ev.end.dateTime)}: ${ev.summary}`}
                      >
                        <span className="font-semibold block truncate">{formatTime(ev.start.dateTime)}</span>
                        <span className="truncate block">{ev.summary}</span>
                      </button>
                    )
                  })}
                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date()
                    const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * SLOT_HEIGHT
                    return (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: nowTop }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
