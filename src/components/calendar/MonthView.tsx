'use client'

import { Card, CardContent } from '@/components/ui/Card'
import type { CalendarEvent, DesktopView, MobileView } from './types'
import { DAYS } from './constants'
import { formatTime } from './utils'

interface MonthViewProps {
  year: number
  month: number
  daysInMonth: number
  firstDay: number
  totalCells: number
  todayKey: string
  eventsByDate: Map<string, CalendarEvent[]>
  desktopView: DesktopView
  mobileView: MobileView
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
  setSelectedDayKey: (key: string) => void
  setDesktopView: (view: DesktopView) => void
  setMobileView: (view: MobileView) => void
}

export function MonthView({
  year,
  month,
  daysInMonth,
  firstDay,
  totalCells,
  todayKey,
  eventsByDate,
  desktopView,
  mobileView,
  getEventColor,
  setSelectedEvent,
  setSelectedDayKey,
  setDesktopView,
  setMobileView,
}: MonthViewProps) {
  if (desktopView !== 'month' && mobileView !== 'calendar') return null

  return (
    <Card className={`overflow-hidden ${mobileView === 'calendar' ? '' : 'hidden md:block'}`}>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - firstDay + 1
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
            const cellDate = isCurrentMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : null
            const isToday = cellDate === todayKey
            const dayEvents = cellDate ? eventsByDate.get(cellDate) || [] : []

            return (
              <div
                key={i}
                onClick={() => {
                  if (isCurrentMonth && cellDate) {
                    setSelectedDayKey(cellDate)
                    setDesktopView('day')
                    setMobileView('day')
                  }
                }}
                className={`min-h-[60px] md:min-h-[100px] border-b border-r border-border/60 p-1 md:p-1.5 transition-colors cursor-pointer ${
                  !isCurrentMonth ? 'bg-secondary/20' : 'hover:bg-secondary/20'
                } ${isToday ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
              >
                {isCurrentMonth && (
                  <>
                    <div
                      className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      {dayNum}
                    </div>
                    {/* Mobile: show dots only */}
                    <div className="md:hidden flex gap-0.5 flex-wrap">
                      {dayEvents.slice(0, 5).map((ev) => {
                        const color = getEventColor(ev)
                        return (
                          <div
                            key={ev.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        )
                      })}
                    </div>
                    {/* Desktop: event pills with border-left style */}
                    <div className="hidden md:block space-y-0.5">
                      {dayEvents.slice(0, 4).map((ev) => {
                        const color = getEventColor(ev)
                        const isAllDay = !!ev.start.date

                        return (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                            className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] truncate border-l-2 transition-all hover:shadow-sm"
                            style={{
                              borderLeftColor: color,
                              backgroundColor: color + '15',
                              color: 'inherit',
                            }}
                            title={`${isAllDay ? '' : formatTime(ev.start.dateTime) + ' '}${ev.summary}${ev._ownerName ? ` (${ev._ownerName})` : ''}`}
                          >
                            {!isAllDay && (
                              <span className="font-semibold mr-0.5" style={{ color }}>{formatTime(ev.start.dateTime)}</span>
                            )}
                            {ev.summary}
                          </button>
                        )
                      })}
                      {dayEvents.length > 4 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDayKey(cellDate!)
                            setDesktopView('day')
                            setMobileView('day')
                          }}
                          className="text-[10px] text-primary font-medium pl-1 hover:underline transition-colors"
                        >
                          +{dayEvents.length - 4} altri
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
