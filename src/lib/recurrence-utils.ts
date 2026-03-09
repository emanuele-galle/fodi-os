export type RecurrenceFrequencyType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'

export interface RecurrenceConfig {
  frequency: RecurrenceFrequencyType
  interval: number
  weekDays: number[]   // 0=Sun..6=Sat
  monthDay: number | null
  startDate: Date
  endDate: Date | null
  maxOccurrences: number | null
  occurrenceCount: number
}

function computeWeeklyNext(after: Date, weekDays: number[], interval: number): Date | null {
  if (weekDays.length === 0) return null
  const sorted = [...weekDays].sort((a, b) => a - b)

  for (let offset = 1; offset <= 7 * interval; offset++) {
    const candidate = new Date(after)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setHours(0, 0, 0, 0)
    if (!sorted.includes(candidate.getDay())) continue

    if (interval === 1 || offset <= 7) return candidate
    const weeksAhead = Math.ceil(offset / 7)
    if (weeksAhead % interval === 0 || weeksAhead === interval) return candidate
  }

  // Fallback: jump to first day of next eligible week
  const fallback = new Date(after)
  fallback.setDate(after.getDate() + 7 * interval - after.getDay() + sorted[0])
  fallback.setHours(0, 0, 0, 0)
  return fallback
}

function computeMonthlyNext(after: Date, monthDay: number | null, interval: number): Date {
  const day = monthDay ?? 1
  const next = new Date(after)
  next.setHours(0, 0, 0, 0)
  next.setMonth(next.getMonth() + interval)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

export function computeNextRunAt(config: RecurrenceConfig, after: Date): Date | null {
  if (isRuleExhausted(config)) return null

  let next: Date | null

  switch (config.frequency) {
    case 'DAILY':
    case 'CUSTOM': {
      next = new Date(after)
      next.setHours(0, 0, 0, 0)
      next.setDate(next.getDate() + config.interval)
      break
    }
    case 'WEEKLY':
      next = computeWeeklyNext(after, config.weekDays, config.interval)
      break
    case 'MONTHLY':
      next = computeMonthlyNext(after, config.monthDay, config.interval)
      break
  }

  if (!next) return null
  if (config.endDate && next > config.endDate) return null
  return next
}

export function isRuleExhausted(config: Pick<RecurrenceConfig, 'maxOccurrences' | 'occurrenceCount' | 'endDate'>): boolean {
  if (config.maxOccurrences != null && config.occurrenceCount >= config.maxOccurrences) return true
  if (config.endDate && new Date() > config.endDate) return true
  return false
}

export function describeRecurrence(frequency: RecurrenceFrequencyType, interval: number, weekDays: number[], monthDay: number | null): string {
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

  switch (frequency) {
    case 'DAILY':
      return interval === 1 ? 'Ogni giorno' : `Ogni ${interval} giorni`
    case 'WEEKLY': {
      const days = [...weekDays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(', ')
      return interval === 1 ? `Ogni settimana: ${days}` : `Ogni ${interval} settimane: ${days}`
    }
    case 'MONTHLY':
      return interval === 1 ? `Ogni mese il giorno ${monthDay}` : `Ogni ${interval} mesi il giorno ${monthDay}`
    case 'CUSTOM':
      return `Ogni ${interval} giorni`
  }
}
