import { describe, it, expect } from 'vitest'
import { sortData } from '@/lib/../hooks/useTableSort'

// sortData is exported and pure, no React hooks needed

describe('Table Sort - sortData', () => {
  const data = [
    { name: 'Charlie', age: 30, date: '2026-01-15', active: true },
    { name: 'Alice', age: 25, date: '2026-03-01', active: false },
    { name: 'Bob', age: 35, date: '2026-02-10', active: true },
  ]

  describe('no sorting', () => {
    it('returns data unchanged when sortKey is null', () => {
      const result = sortData(data, null, 'asc')
      expect(result).toEqual(data)
    })
  })

  describe('string sorting', () => {
    it('sorts strings ascending', () => {
      const result = sortData(data, 'name', 'asc')
      expect(result.map((d) => d.name)).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('sorts strings descending', () => {
      const result = sortData(data, 'name', 'desc')
      expect(result.map((d) => d.name)).toEqual(['Charlie', 'Bob', 'Alice'])
    })
  })

  describe('numeric sorting', () => {
    it('sorts numbers ascending', () => {
      const result = sortData(data, 'age', 'asc')
      expect(result.map((d) => d.age)).toEqual([25, 30, 35])
    })

    it('sorts numbers descending', () => {
      const result = sortData(data, 'age', 'desc')
      expect(result.map((d) => d.age)).toEqual([35, 30, 25])
    })
  })

  describe('date sorting', () => {
    it('sorts ISO date strings ascending', () => {
      const result = sortData(data, 'date', 'asc')
      expect(result.map((d) => d.date)).toEqual(['2026-01-15', '2026-02-10', '2026-03-01'])
    })

    it('sorts ISO date strings descending', () => {
      const result = sortData(data, 'date', 'desc')
      expect(result.map((d) => d.date)).toEqual(['2026-03-01', '2026-02-10', '2026-01-15'])
    })
  })

  describe('boolean sorting', () => {
    it('sorts booleans ascending (false first)', () => {
      const result = sortData(data, 'active', 'asc')
      expect(result.map((d) => d.active)).toEqual([false, true, true])
    })

    it('sorts booleans descending (true first)', () => {
      const result = sortData(data, 'active', 'desc')
      expect(result.map((d) => d.active)).toEqual([true, true, false])
    })
  })

  describe('null handling', () => {
    it('puts null values at the end', () => {
      const dataWithNull = [
        { name: 'Bob', value: 10 },
        { name: 'Alice', value: null },
        { name: 'Charlie', value: 5 },
      ]
      const result = sortData(dataWithNull, 'value', 'asc')
      expect(result.map((d) => d.value)).toEqual([5, 10, null])
    })
  })

  describe('custom getValue', () => {
    it('uses custom getValue function', () => {
      const items = [
        { nested: { score: 10 } },
        { nested: { score: 5 } },
        { nested: { score: 20 } },
      ]
      const result = sortData(items, 'score', 'asc', (item, key) => {
        if (key === 'score') return item.nested.score
        return undefined
      })
      expect(result.map((d) => d.nested.score)).toEqual([5, 10, 20])
    })
  })

  describe('immutability', () => {
    it('does not mutate original array', () => {
      const original = [...data]
      sortData(data, 'name', 'asc')
      expect(data).toEqual(original)
    })
  })
})
