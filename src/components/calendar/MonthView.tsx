'use client'

import { Card, CardContent } from '@/components/ui/Card'
import type { CalendarEvent, DesktopView, MobileView } from './types'
import { DAYS } from './constants'
import { formatTime } from './utils'

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function getWeekDateForRow(i: number, firstDay: number, daysInMonth: number, year: number, month: number): Date {
  const rowDayNum = i - firstDay + 1
  if (rowDayNum >= 1 && rowDayNum <= daysInMonth) return new Date(year, month, rowDayNum)
  return rowDayNum < 1 ? new Date(year, month, 1) : new Date(year, month, daysInMonth)
}

/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- loop handler + dynamic color */
function MonthDayCell({
  dayNum, isCurrentMonth, cellDate, isToday, dayEvents,
  getEventColor, setSelectedEvent, setSelectedDayKey, setDesktopView, setMobileView,
}: {
  dayNum: number
  isCurrentMonth: boolean
  cellDate: string | null
  isToday: boolean
  dayEvents: CalendarEvent[]
  getEventColor: (ev: CalendarEvent) => string
  setSelectedEvent: (ev: CalendarEvent) => void
  setSelectedDayKey: (key: string) => void
  setDesktopView: (view: DesktopView) => void
  setMobileView: (view: MobileView) => void
}) {
  return (
    <div
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
              isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
            }`}
          >
            {dayNum}
          </div>
          <div className="md:hidden flex gap-0.5 flex-wrap">
            {dayEvents.slice(0, 5).map((ev) => (
              <div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventColor(ev) }} />
            ))}
          </div>
          <div className="hidden md:block space-y-0.5">
            {dayEvents.slice(0, 4).map((ev) => {
              const color = getEventColor(ev)
              const isAllDay = !!ev.start.date
              return (
                <button
                  key={ev.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                  className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] truncate border-l-2 transition-all hover:shadow-sm"
                  style={{ borderLeftColor: color, backgroundColor: color + '15', color: 'inherit' }}
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
}

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
  year, month, daysInMonth, firstDay, totalCells, todayKey,
  eventsByDate, desktopView, mobileView,
  getEventColor, setSelectedEvent, setSelectedDayKey, setDesktopView, setMobileView,
}: MonthViewProps) {
  if (desktopView !== 'month' && mobileView !== 'calendar') return null

  const cells: React.ReactNode[] = []
  for (let i = 0; i < totalCells; i++) {
    if (i % 7 === 0) {
      const weekDate = getWeekDateForRow(i, firstDay, daysInMonth, year, month)
      cells.push(
        <div key={`w${i}`} className="hidden md:flex items-start justify-center pt-2 text-[10px] text-muted/40 border-b border-border/30 select-none">
          {getISOWeek(weekDate)}
        </div>
      )
    }

    const dayNum = i - firstDay + 1
    const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
    const cellDate = isCurrentMonth
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      : null
    const isToday = cellDate === todayKey
    const dayEvents = cellDate ? eventsByDate.get(cellDate) || [] : []

    cells.push(
      <MonthDayCell
        key={`d${i}`}
        dayNum={dayNum}
        isCurrentMonth={isCurrentMonth}
        cellDate={cellDate}
        isToday={isToday}
        dayEvents={dayEvents}
        getEventColor={getEventColor}
        setSelectedEvent={setSelectedEvent}
        setSelectedDayKey={setSelectedDayKey}
        setDesktopView={setDesktopView}
        setMobileView={setMobileView}
      />
    )
  }

  return (
    <Card className={`overflow-hidden ${mobileView === 'calendar' ? '' : 'hidden md:block'}`}>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 md:grid-cols-[24px_repeat(7,1fr)] border-b border-border">
          <div className="py-2 text-center text-[10px] text-muted/50 hidden md:block select-none">W</div>
          {DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 md:grid-cols-[24px_repeat(7,1fr)]">
          {cells}
        </div>
      </CardContent>
    </Card>
  )
}
