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

export function computeNextRunAt(config: RecurrenceConfig, after: Date): Date | null {
  if (isRuleExhausted(config)) return null

  const next = new Date(after)
  next.setHours(0, 0, 0, 0)

  switch (config.frequency) {
    case 'DAILY':
    case 'CUSTOM':
      next.setDate(next.getDate() + config.interval)
      break

    case 'WEEKLY': {
      if (config.weekDays.length === 0) return null
      const sorted = [...config.weekDays].sort((a, b) => a - b)

      // Find next matching day in current or following weeks
      let found = false
      for (let offset = 1; offset <= 7 * config.interval; offset++) {
        const candidate = new Date(after)
        candidate.setDate(candidate.getDate() + offset)
        candidate.setHours(0, 0, 0, 0)
        const candidateDay = candidate.getDay()

        if (sorted.includes(candidateDay)) {
          // For interval > 1, only accept days in the correct week
          if (config.interval === 1 || offset <= 7) {
            next.setTime(candidate.getTime())
            found = true
            break
          }
          // For interval > 1, skip to the right week
          const weeksAhead = Math.ceil(offset / 7)
          if (weeksAhead % config.interval === 0 || weeksAhead === config.interval) {
            next.setTime(candidate.getTime())
            found = true
            break
          }
        }
      }

      if (!found) {
        // Jump to first day of next eligible week
        const daysUntilNextWeek = 7 * config.interval - after.getDay() + sorted[0]
        next.setDate(after.getDate() + daysUntilNextWeek)
      }
      break
    }

    case 'MONTHLY': {
      const day = config.monthDay ?? 1
      next.setMonth(next.getMonth() + config.interval)
      // Clamp to last day of month if needed
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(day, lastDay))
      break
    }
  }

  // Check if next run is past endDate
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
