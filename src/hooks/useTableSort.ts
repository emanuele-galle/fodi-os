'use client'

import { useState, useCallback } from 'react'

type SortDir = 'asc' | 'desc'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

function applyDir(cmp: number, dir: SortDir): number {
  return dir === 'asc' ? cmp : -cmp
}

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return parseFloat(val)
  return NaN
}

function isDateString(val: unknown): val is string {
  return typeof val === 'string' && ISO_DATE_RE.test(val)
}

function compareDates(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function compareBooleans(a: boolean, b: boolean): number {
  if (a === b) return 0
  return a ? 1 : -1
}

function compareValues(aVal: unknown, bVal: unknown): number | null {
  if (isDateString(aVal) && isDateString(bVal)) return compareDates(aVal, bVal)

  const aNum = toNumber(aVal)
  const bNum = toNumber(bVal)
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum

  if (typeof aVal === 'boolean' && typeof bVal === 'boolean') return compareBooleans(aVal, bVal)

  return null
}

function compare(aVal: unknown, bVal: unknown, dir: SortDir): number {
  if (aVal == null && bVal == null) return 0
  if (aVal == null) return 1
  if (bVal == null) return -1

  const result = compareValues(aVal, bVal)
  if (result !== null) return applyDir(result, dir)

  return applyDir(String(aVal).localeCompare(String(bVal), 'it', { sensitivity: 'base' }), dir)
}

export function useTableSort(defaultKey?: string, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
      } else {
        setSortDir('asc')
      }
      return key
    })
  }, [])

  const sortIcon = useCallback((key: string) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }, [sortKey, sortDir])

  return { sortKey, sortDir, handleSort, sortIcon }
}

export function sortData<T>(
  data: T[],
  sortKey: string | null,
  sortDir: SortDir,
  getValue?: (item: T, key: string) => unknown,
): T[] {
  if (!sortKey) return data
  return [...data].sort((a, b) => {
    const aVal = getValue ? getValue(a, sortKey) : (a as Record<string, unknown>)[sortKey]
    const bVal = getValue ? getValue(b, sortKey) : (b as Record<string, unknown>)[sortKey]
    return compare(aVal, bVal, sortDir)
  })
}
