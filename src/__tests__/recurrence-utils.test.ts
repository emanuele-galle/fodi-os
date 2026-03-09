import { describe, it, expect } from 'vitest'
import { computeNextRunAt, isRuleExhausted, describeRecurrence, type RecurrenceConfig } from '@/lib/recurrence-utils'

function makeConfig(overrides: Partial<RecurrenceConfig> = {}): RecurrenceConfig {
  return {
    frequency: 'DAILY',
    interval: 1,
    weekDays: [],
    monthDay: null,
    startDate: new Date('2026-01-01'),
    endDate: null,
    maxOccurrences: null,
    occurrenceCount: 0,
    ...overrides,
  }
}

describe('computeNextRunAt', () => {
  describe('DAILY', () => {
    it('returns next day for interval 1', () => {
      const config = makeConfig({ frequency: 'DAILY', interval: 1 })
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toEqual(new Date('2026-03-10'))
    })

    it('returns correct date for interval 3', () => {
      const config = makeConfig({ frequency: 'DAILY', interval: 3 })
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toEqual(new Date('2026-03-12'))
    })

    it('crosses month boundary', () => {
      const config = makeConfig({ frequency: 'DAILY', interval: 1 })
      const result = computeNextRunAt(config, new Date('2026-03-31'))
      expect(result).toEqual(new Date('2026-04-01'))
    })
  })

  describe('WEEKLY', () => {
    it('returns next matching weekday', () => {
      // 2026-03-09 is Monday (1)
      const config = makeConfig({ frequency: 'WEEKLY', interval: 1, weekDays: [3] }) // Wednesday
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toEqual(new Date('2026-03-11')) // Wednesday
    })

    it('wraps to next week if day already passed', () => {
      // 2026-03-12 is Thursday (4)
      const config = makeConfig({ frequency: 'WEEKLY', interval: 1, weekDays: [1] }) // Monday
      const result = computeNextRunAt(config, new Date('2026-03-12'))
      expect(result).toEqual(new Date('2026-03-16')) // next Monday
    })

    it('picks earliest matching day', () => {
      // 2026-03-09 is Monday (1)
      const config = makeConfig({ frequency: 'WEEKLY', interval: 1, weekDays: [3, 5] }) // Wed, Fri
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toEqual(new Date('2026-03-11')) // Wednesday (closest)
    })

    it('returns null for empty weekDays', () => {
      const config = makeConfig({ frequency: 'WEEKLY', interval: 1, weekDays: [] })
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toBeNull()
    })
  })

  describe('MONTHLY', () => {
    it('returns same day next month', () => {
      const config = makeConfig({ frequency: 'MONTHLY', interval: 1, monthDay: 15 })
      const result = computeNextRunAt(config, new Date('2026-03-09'))
      expect(result).toEqual(new Date('2026-04-15'))
    })

    it('clamps to last day of month (Feb)', () => {
      const config = makeConfig({ frequency: 'MONTHLY', interval: 1, monthDay: 31 })
      const result = computeNextRunAt(config, new Date('2026-01-15'))
      expect(result).toEqual(new Date('2026-02-28')) // Feb 2026 has 28 days
    })

    it('supports interval > 1', () => {
      const config = makeConfig({ frequency: 'MONTHLY', interval: 3, monthDay: 10 })
      const result = computeNextRunAt(config, new Date('2026-01-10'))
      expect(result).toEqual(new Date('2026-04-10'))
    })
  })

  describe('CUSTOM', () => {
    it('works like DAILY with custom interval', () => {
      const config = makeConfig({ frequency: 'CUSTOM', interval: 14 })
      const result = computeNextRunAt(config, new Date('2026-03-01'))
      expect(result).toEqual(new Date('2026-03-15'))
    })
  })

  describe('exhaustion', () => {
    it('returns null when maxOccurrences reached', () => {
      const config = makeConfig({ maxOccurrences: 5, occurrenceCount: 5 })
      expect(computeNextRunAt(config, new Date('2026-03-09'))).toBeNull()
    })

    it('returns null when past endDate', () => {
      const config = makeConfig({ endDate: new Date('2026-03-01') })
      expect(computeNextRunAt(config, new Date('2026-03-09'))).toBeNull()
    })

    it('returns null when next run would be past endDate', () => {
      const config = makeConfig({ frequency: 'DAILY', interval: 1, endDate: new Date('2026-03-10') })
      const result = computeNextRunAt(config, new Date('2026-03-10'))
      expect(result).toBeNull()
    })
  })
})

describe('isRuleExhausted', () => {
  it('returns false for fresh rule', () => {
    expect(isRuleExhausted({ maxOccurrences: 10, occurrenceCount: 0, endDate: null })).toBe(false)
  })

  it('returns true when occurrences reached', () => {
    expect(isRuleExhausted({ maxOccurrences: 5, occurrenceCount: 5, endDate: null })).toBe(true)
  })

  it('returns true when past endDate', () => {
    expect(isRuleExhausted({ maxOccurrences: null, occurrenceCount: 0, endDate: new Date('2020-01-01') })).toBe(true)
  })

  it('returns false with no limits', () => {
    expect(isRuleExhausted({ maxOccurrences: null, occurrenceCount: 100, endDate: null })).toBe(false)
  })
})

describe('describeRecurrence', () => {
  it('describes daily', () => {
    expect(describeRecurrence('DAILY', 1, [], null)).toBe('Ogni giorno')
    expect(describeRecurrence('DAILY', 3, [], null)).toBe('Ogni 3 giorni')
  })

  it('describes weekly with day names', () => {
    expect(describeRecurrence('WEEKLY', 1, [1, 3, 5], null)).toBe('Ogni settimana: Lun, Mer, Ven')
  })

  it('describes monthly', () => {
    expect(describeRecurrence('MONTHLY', 1, [], 15)).toBe('Ogni mese il giorno 15')
    expect(describeRecurrence('MONTHLY', 2, [], 1)).toBe('Ogni 2 mesi il giorno 1')
  })

  it('describes custom', () => {
    expect(describeRecurrence('CUSTOM', 14, [], null)).toBe('Ogni 14 giorni')
  })
})
