'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Download, ChevronLeft, ChevronRight, ArrowUpDown,
  Loader2, Users,
} from 'lucide-react'

interface UserProgress {
  id: string
  firstName: string
  lastName: string
  email: string
  coursesStarted: number
  coursesCompleted: number
  totalTimeSpentSecs: number
  lastActivityAt: string | null
}

type SortKey = 'name' | 'coursesStarted' | 'coursesCompleted' | 'totalTimeSpentSecs' | 'lastActivityAt'
type SortDir = 'asc' | 'desc'

function formatTime(secs: number): string {
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'adesso'
  if (mins < 60) return `${mins} min fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}g fa`
  return new Date(dateStr).toLocaleDateString('it-IT')
}

interface UserProgressTableProps {
  onUserClick?: (userId: string) => void
}

export function UserProgressTable({ onUserClick }: UserProgressTableProps) {
  const [users, setUsers] = useState<UserProgress[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const limit = 15

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/training/analytics/users?${params}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setUsers(json.data ?? [])
        setTotal(json.total ?? 0)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Debounced search
  useEffect(() => {
    setPage(1)
  }, [search])

  const sorted = useMemo(() => {
    const arr = [...users]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
          break
        case 'coursesStarted':
          cmp = a.coursesStarted - b.coursesStarted
          break
        case 'coursesCompleted':
          cmp = a.coursesCompleted - b.coursesCompleted
          break
        case 'totalTimeSpentSecs':
          cmp = a.totalTimeSpentSecs - b.totalTimeSpentSecs
          break
        case 'lastActivityAt':
          cmp = (a.lastActivityAt ?? '').localeCompare(b.lastActivityAt ?? '')
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return arr
  }, [users, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleExport() {
    window.open('/api/training/analytics/export?type=enrollments', '_blank')
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Progresso Utenti</h2>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Esporta CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Cerca utente per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 pl-9 pr-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted/40 mb-3" />
          <p className="text-sm text-muted">Nessun utente trovato</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    {([
                      ['name', 'Nome'],
                      ['coursesStarted', 'Corsi Iniziati'],
                      ['coursesCompleted', 'Corsi Completati'],
                      ['totalTimeSpentSecs', 'Tempo Totale'],
                      ['lastActivityAt', 'Ultima Attivita'],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-4 py-3 text-left text-xs font-medium text-muted cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <ArrowUpDown className={`h-3 w-3 ${sortKey === key ? 'text-foreground' : 'opacity-30'}`} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sorted.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => onUserClick?.(user.id)}
                      className="hover:bg-secondary/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{user.coursesStarted}</td>
                      <td className="px-4 py-3 text-foreground">{user.coursesCompleted}</td>
                      <td className="px-4 py-3 text-foreground">{formatTime(user.totalTimeSpentSecs)}</td>
                      <td className="px-4 py-3 text-muted">{formatRelativeTime(user.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {(page - 1) * limit + 1}-{Math.min(page * limit, total)} di {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-foreground">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
