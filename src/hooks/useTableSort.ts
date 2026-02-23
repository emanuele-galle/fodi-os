'use client'

import { useState, useCallback } from 'react'

type SortDir = 'asc' | 'desc'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

function compare(aVal: unknown, bVal: unknown, dir: SortDir): number {
  if (aVal == null && bVal == null) return 0
  if (aVal == null) return 1
  if (bVal == null) return -1

  // Date strings (ISO format) — compare lexicographically (YYYY-MM-DD sorts correctly)
  if (typeof aVal === 'string' && typeof bVal === 'string' && ISO_DATE_RE.test(aVal) && ISO_DATE_RE.test(bVal)) {
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  }

  // Numbers (including numeric strings like amounts)
  const aNum = typeof aVal === 'number' ? aVal : typeof aVal === 'string' ? parseFloat(aVal) : NaN
  const bNum = typeof bVal === 'number' ? bVal : typeof bVal === 'string' ? parseFloat(bVal) : NaN

  if (!isNaN(aNum) && !isNaN(bNum)) {
    return dir === 'asc' ? aNum - bNum : bNum - aNum
  }

  if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
    if (aVal === bVal) return 0
    return dir === 'asc' ? (aVal ? 1 : -1) : (aVal ? -1 : 1)
  }

  const cmp = String(aVal).localeCompare(String(bVal), 'it', { sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
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
