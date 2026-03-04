'use client'

import { useEffect } from 'react'
import { formatLocalDateKey } from '@/components/calendar/utils'
import type { DesktopView } from '@/components/calendar/types'

interface UseCalendarKeyboardOptions {
  selectedDayKey: string
  setSelectedDayKey: (key: string) => void
  setYear: (y: number) => void
  setMonth: (m: number) => void
  setDesktopView: (view: DesktopView) => void
  goToToday: () => void
  todayKey: string
  openNewEventForDate: (dateStr: string) => void
  showNewEvent: boolean
  selectedEvent: unknown | null
}

export function useCalendarKeyboard({
  selectedDayKey, setSelectedDayKey, setYear, setMonth,
  setDesktopView, goToToday, todayKey,
  openNewEventForDate, showNewEvent, selectedEvent,
}: UseCalendarKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs or when modals are open
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (showNewEvent || selectedEvent) {
        if (e.key === 'Escape') return // let modals handle Escape
        return
      }

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault()
          const d = new Date(selectedDayKey + 'T00:00:00')
          d.setDate(d.getDate() - 1)
          setSelectedDayKey(formatLocalDateKey(d))
          setYear(d.getFullYear())
          setMonth(d.getMonth())
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const d = new Date(selectedDayKey + 'T00:00:00')
          d.setDate(d.getDate() + 1)
          setSelectedDayKey(formatLocalDateKey(d))
          setYear(d.getFullYear())
          setMonth(d.getMonth())
          break
        }
        case 't':
        case 'T':
          e.preventDefault()
          goToToday()
          setSelectedDayKey(todayKey)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          openNewEventForDate(selectedDayKey)
          break
        case 'm':
          e.preventDefault()
          setDesktopView('month')
          break
        case 'w':
          e.preventDefault()
          setDesktopView('week')
          break
        case 'd':
          e.preventDefault()
          setDesktopView('day')
          break
        case 'a':
          e.preventDefault()
          setDesktopView('agenda')
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedDayKey, setSelectedDayKey, setYear, setMonth, setDesktopView, goToToday, todayKey, openNewEventForDate, showNewEvent, selectedEvent])
}
