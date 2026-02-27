'use client'

import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CalendarDays,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatMonthYear } from './utils'
import type { DesktopView } from './types'

interface CalendarHeaderProps {
  today: Date
  year: number
  month: number
  isCurrentMonth: boolean
  todayKey: string
  desktopView: DesktopView
  setDesktopView: (view: DesktopView) => void
  setSelectedDayKey: (key: string) => void
  goToToday: () => void
  prevMonth: () => void
  nextMonth: () => void
  openNewEventForDate: (dateStr: string) => void
}

export function CalendarHeader({
  today,
  year,
  month,
  isCurrentMonth,
  todayKey,
  desktopView,
  setDesktopView,
  setSelectedDayKey,
  goToToday,
  prevMonth,
  nextMonth,
  openNewEventForDate,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
          <p className="text-sm text-muted">
            {today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className={isCurrentMonth ? 'opacity-50' : ''}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Oggi
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[130px] sm:min-w-[160px] text-center capitalize">
            {formatMonthYear(year, month)}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden md:flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <button
            onClick={() => setDesktopView('month')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              desktopView === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            Mese
          </button>
          <button
            onClick={() => setDesktopView('week')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              desktopView === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            Settimana
          </button>
          <button
            onClick={() => { setDesktopView('day'); setSelectedDayKey(todayKey) }}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              desktopView === 'day' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            Giorno
          </button>
        </div>

        <Link href="/calendar/availability">
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Disponibilita</span>
          </Button>
        </Link>
        <Button size="sm" className="ml-auto sm:ml-0" onClick={() => openNewEventForDate(todayKey)}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nuovo Evento</span>
          <span className="sm:hidden">Nuovo</span>
        </Button>
      </div>
    </div>
  )
}
