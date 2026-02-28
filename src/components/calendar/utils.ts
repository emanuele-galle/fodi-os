import { CalendarEvent, RecurrenceType, RecurrenceEndType } from './types'
import { RRULE_DAYS, EVENT_COLORS } from './constants'

export function buildRruleString(
  type: RecurrenceType,
  startDate: string,
  customDays: number[],
  endType: RecurrenceEndType,
  endDate: string,
  endCount: number,
): string[] {
  if (type === 'none') return []

  let rule = 'RRULE:'
  const dayOfWeek = startDate ? new Date(startDate + 'T00:00:00').getDay() : 1

  switch (type) {
    case 'daily':
      rule += 'FREQ=DAILY'
      break
    case 'weekly':
      rule += `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[dayOfWeek]}`
      break
    case 'biweekly':
      rule += `FREQ=WEEKLY;INTERVAL=2;BYDAY=${RRULE_DAYS[dayOfWeek]}`
      break
    case 'monthly':
      rule += 'FREQ=MONTHLY'
      break
    case 'custom':
      if (customDays.length === 0) return []
      rule += `FREQ=WEEKLY;BYDAY=${customDays.map((d) => RRULE_DAYS[d]).join(',')}`
      break
  }

  if (endType === 'date' && endDate) {
    rule += `;UNTIL=${endDate.replace(/-/g, '')}T235959Z`
  } else if (endType === 'count' && endCount > 0) {
    rule += `;COUNT=${endCount}`
  }

  return [rule]
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

export function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateRange(start: CalendarEvent['start'], end: CalendarEvent['end']) {
  const startTime = formatTime(start.dateTime)
  const endTime = formatTime(end.dateTime)
  if (start.date) return 'Tutto il giorno'
  return `${startTime} - ${endTime}`
}

export function formatDateFull(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const newH = Math.min(h + 1, 23)
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function getWeekDates(year: number, month: number, day: number): Date[] {
  const date = new Date(year, month, day)
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function getEventColor(
  ev: CalendarEvent,
  isMultiUser: boolean,
  teamColorMap: Map<string, string>,
  defaultColor: string,
) {
  if (isMultiUser && ev._ownerUserId) {
    return teamColorMap.get(ev._ownerUserId) || defaultColor
  }
  if (ev._calendarColor) {
    return ev._calendarColor
  }
  const colorIdx = ev.colorId ? parseInt(ev.colorId) - 1 : 0
  return EVENT_COLORS[colorIdx] || EVENT_COLORS[0]
}

export function getEventPositionStyle(ev: CalendarEvent, slotHeight: number) {
  if (!ev.start.dateTime || !ev.end.dateTime) return null
  const start = new Date(ev.start.dateTime)
  const end = new Date(ev.end.dateTime)
  const startMins = start.getHours() * 60 + start.getMinutes()
  const endMins = end.getHours() * 60 + end.getMinutes()
  const top = (startMins / 60) * slotHeight
  const height = Math.max(((endMins - startMins) / 60) * slotHeight, slotHeight / 2)
  return { top, height }
}
