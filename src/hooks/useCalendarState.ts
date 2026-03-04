'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatLocalDateKey, getDaysInMonth, getFirstDayOfMonth, getWeekDates } from '@/components/calendar/utils'
import type { DesktopView, MobileView } from '@/components/calendar/types'

export function useCalendarState() {
  const [today, setToday] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [mobileView, setMobileView] = useState<MobileView>('day')
  const [desktopView, setDesktopView] = useState<DesktopView>('day')
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => formatLocalDateKey(new Date()))
  const [weekAnchor, setWeekAnchor] = useState(today.getDate())

  // Update today at midnight or on visibility change
  useEffect(() => {
    const updateToday = () => {
      const now = new Date()
      setToday((prev) => {
        if (prev.toDateString() !== now.toDateString()) return now
        return prev
      })
    }
    const interval = setInterval(updateToday, 60_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') updateToday() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  const goToToday = useCallback(() => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setWeekAnchor(today.getDate())
  }, [today])

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }, [month])

  // Derived state
  const todayKey = formatLocalDateKey(today)
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const weekDates = useMemo(() => getWeekDates(year, month, weekAnchor), [year, month, weekAnchor])

  return {
    today, year, month, setYear, setMonth,
    mobileView, setMobileView,
    desktopView, setDesktopView,
    selectedDayKey, setSelectedDayKey,
    weekAnchor, setWeekAnchor,
    goToToday, prevMonth, nextMonth,
    todayKey, isCurrentMonth, daysInMonth, firstDay, totalCells, weekDates,
  }
}
