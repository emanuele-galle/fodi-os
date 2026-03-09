import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDueUrgency } from '@/lib/task-utils'


describe('Task Utils - getDueUrgency', () => {
  beforeEach(() => {
    // Fix "now" to 2026-03-09T12:00:00Z for deterministic tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('returns "none" for completed/cancelled/no-date tasks', () => {
    it('returns "none" when dueDate is null', () => {
      expect(getDueUrgency(null, 'TODO')).toBe('none')
    })

    it('returns "none" when dueDate is undefined', () => {
      expect(getDueUrgency(undefined, 'TODO')).toBe('none')
    })

    it('returns "none" for DONE status regardless of due date', () => {
      expect(getDueUrgency('2026-03-01', 'DONE')).toBe('none')
    })

    it('returns "none" for CANCELLED status regardless of due date', () => {
      expect(getDueUrgency('2026-03-01', 'CANCELLED')).toBe('none')
    })
  })

  describe('urgency levels', () => {
    it('returns "overdue" for past dates', () => {
      expect(getDueUrgency('2026-03-07', 'TODO')).toBe('overdue')
    })

    it('returns "today" for today\'s date', () => {
      expect(getDueUrgency('2026-03-09', 'IN_PROGRESS')).toBe('today')
    })

    it('returns "tomorrow" for next day', () => {
      expect(getDueUrgency('2026-03-10', 'TODO')).toBe('tomorrow')
    })

    it('returns "this_week" for 2-7 days away', () => {
      expect(getDueUrgency('2026-03-12', 'TODO')).toBe('this_week')
      expect(getDueUrgency('2026-03-16', 'TODO')).toBe('this_week')
    })

    it('returns "normal" for more than 7 days away', () => {
      expect(getDueUrgency('2026-03-17', 'TODO')).toBe('normal')
      expect(getDueUrgency('2026-04-01', 'IN_PROGRESS')).toBe('normal')
    })
  })
})
