'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useCallback } from 'react'
import { getDaysInMonth, getFirstDayOfMonth } from './utils'
import { DAYS } from './constants'
import type { CalendarEvent } from './types'

interface MiniCalendarProps {
  todayKey: string
  selectedDayKey: string
  eventsByDate: Map<string, CalendarEvent[]>
  onSelectDay: (key: string) => void
}

export function MiniCalendar({ todayKey, selectedDayKey, eventsByDate, onSelectDay }: MiniCalendarProps) {
  const [viewYear, setViewYear] = useState(() => parseInt(selectedDayKey.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDayKey.split('-')[1]) - 1)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const prevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11 }
      return m - 1
    })
  }, [])
  const nextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0 }
      return m + 1
    })
  }, [])

  const handleDayClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const key = e.currentTarget.dataset.dateKey
    if (key) onSelectDay(key)
  }, [onSelectDay])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-secondary/50 transition-colors">
          <ChevronLeft className="h-3 w-3 text-muted" />
        </button>
        <span className="text-xs font-medium capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-secondary/50 transition-colors">
          <ChevronRight className="h-3 w-3 text-muted" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[11px] text-muted py-0.5">{day[0]}</div>
        ))}
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - firstDay + 1
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
          if (!isCurrentMonth) return <div key={i} />

          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDayKey
          const hasEvents = (eventsByDate.get(dateKey) || []).length > 0

          return (
            <button
              key={i}
              data-date-key={dateKey}
              onClick={handleDayClick}
              className={`w-7 h-7 mx-auto text-xs rounded-full flex items-center justify-center transition-colors relative ${
                isSelected ? 'bg-primary text-primary-foreground' :
                isToday ? 'bg-primary/20 text-primary font-bold' :
                'hover:bg-secondary/50'
              }`}
            >
              {dayNum}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
