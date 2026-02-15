'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, ChevronLeft, ChevronRight, Loader2, ShieldAlert,
  Filter,
} from 'lucide-react'

interface SecurityLog {
  id: string
  userId: string
  lessonId: string | null
  courseId: string | null
  event: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

const EVENT_TYPES = [
  { value: '', label: 'Tutti gli eventi' },
  { value: 'tab_switch', label: 'Cambio Tab' },
  { value: 'print_attempt', label: 'Tentativo Stampa' },
  { value: 'screen_capture', label: 'Screen Capture' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'copy_attempt', label: 'Tentativo Copia' },
  { value: 'right_click', label: 'Click Destro' },
]

const EVENT_COLORS: Record<string, string> = {
  tab_switch: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  print_attempt: 'bg-red-500/10 text-red-600 border-red-500/20',
  screen_capture: 'bg-red-500/10 text-red-600 border-red-500/20',
  devtools: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  copy_attempt: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  right_click: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'adesso'
  if (mins < 60) return `${mins} min fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}g fa`
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SecurityLogsViewer() {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const limit = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (event) params.set('event', event)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/training/security/logs?${params}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setLogs(json.data ?? [])
        setTotal(json.total ?? 0)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, event, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setPage(1)
  }, [event, dateFrom, dateTo])

  // Client-side user filter
  const filtered = userSearch
    ? logs.filter((log) => {
        if (!log.user) return false
        const name = `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase()
        return name.includes(userSearch.toLowerCase())
      })
    : logs

  const totalPages = Math.ceil(total / limit)

  const inputClass = 'flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Log di Sicurezza</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            showFilters
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border/50 text-muted hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtri
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Tipo Evento</label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className={inputClass}
              >
                {EVENT_TYPES.map((et) => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Cerca Utente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Nome o email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Data Da</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Data A</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-10 w-10 text-muted/40 mb-3" />
          <p className="text-sm text-muted">Nessun log di sicurezza trovato</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">Utente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">Evento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">Lezione</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted whitespace-nowrap">Dettagli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filtered.map((log) => {
                    const colorClass = EVENT_COLORS[log.event] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    return (
                      <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">
                          {formatRelativeTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {log.user ? (
                            <div>
                              <p className="text-foreground text-xs font-medium">
                                {log.user.firstName} {log.user.lastName}
                              </p>
                              <p className="text-[11px] text-muted">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">{log.userId.slice(0, 8)}...</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full border ${colorClass}`}>
                            {log.event.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {log.lessonId ? log.lessonId.slice(0, 8) + '...' : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted font-mono">
                          {log.ipAddress ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '-'}
                        </td>
                      </tr>
                    )
                  })}
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
