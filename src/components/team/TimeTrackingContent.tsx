'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Clock, LogIn, LogOut, Users, Calendar, Timer, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useTableSort, sortData } from '@/hooks/useTableSort'

interface WorkSession {
  id: string
  userId: string
  clockIn: string
  clockOut: string | null
  lastHeartbeat: string
  durationMins: number
  liveDurationMins: number
  isActive: boolean
  notes: string | null
  user: { id: string; firstName: string; lastName: string; avatarUrl?: string | null }
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
}

function formatDuration(mins: number): string {
  if (mins < 0) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const d = new Date(date)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Oggi'
  if (d.getTime() === yesterday.getTime()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]
}

export function TimeTrackingContent() {
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [clockingOut, setClockingOut] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const { sortKey: tsSortKey, sortDir: tsSortDir, handleSort: tsHandleSort, sortIcon: tsSortIcon } = useTableSort('clockIn')

  const getSessionValue = useCallback((item: any, key: string) => {
    if (key === 'userName') return `${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`
    if (key === 'duration') return item.liveDurationMins || item.durationMins || 0
    return item[key]
  }, [])

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (userFilter) params.set('userId', userFilter)
      params.set('limit', '200')
      const res = await fetch(`/api/work-sessions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.items || [])
      } else {
        setFetchError('Errore nel caricamento delle sessioni')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle sessioni')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, userFilter])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  useEffect(() => {
    const hasActive = sessions.some((s) => s.isActive)
    if (!hasActive) return
    const interval = setInterval(fetchSessions, 60000)
    return () => clearInterval(interval)
  }, [sessions, fetchSessions])

  useEffect(() => {
    fetch('/api/users').then((r) => r.ok ? r.json() : null).then((d) => {
      const list = d?.items || d?.users || (Array.isArray(d) ? d : [])
      setUsers(list)
    })
  }, [])

  const groupedSessions = useMemo(() => {
    const groups: { dateKey: string; label: string; sessions: WorkSession[]; totalMins: number }[] = []
    const map = new Map<string, WorkSession[]>()

    for (const s of sessions) {
      const key = getDateKey(s.clockIn)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }

    for (const [dateKey, groupSessions] of map) {
      groups.push({
        dateKey,
        label: formatDateLabel(groupSessions[0].clockIn),
        sessions: groupSessions.sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()),
        totalMins: groupSessions.reduce((s, e) => s + (e.liveDurationMins || e.durationMins || 0), 0),
      })
    }

    return groups
  }, [sessions])

  const todayKey = new Date().toISOString().split('T')[0]
  const todayMins = groupedSessions.find((g) => g.dateKey === todayKey)?.totalMins || 0
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekMins = sessions
    .filter((s) => new Date(s.clockIn) >= weekStart)
    .reduce((sum, s) => sum + (s.liveDurationMins || s.durationMins || 0), 0)
  const onlineNow = sessions.filter((s) => s.isActive)

  function exportCSV() {
    if (sessions.length === 0) return
    const rows = [['Utente', 'Data', 'Entrata', 'Uscita', 'Durata (min)', 'Stato']]
    for (const s of sessions) {
      rows.push([
        `${s.user.firstName} ${s.user.lastName}`,
        new Date(s.clockIn).toLocaleDateString('it-IT'),
        formatTime(s.clockIn),
        s.clockOut ? formatTime(s.clockOut) : 'In corso',
        String(s.liveDurationMins || s.durationMins || 0),
        s.isActive ? 'Online' : 'Offline',
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presenze-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClockOut = async () => {
    setClockingOut(true)
    try {
      await fetch('/api/work-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock-out' }),
      })
      fetchSessions()
    } finally {
      setClockingOut(false)
    }
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-6">
        {sessions.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Esporta CSV</span>
          </Button>
        )}
        {onlineNow.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleClockOut} loading={clockingOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Disconnettiti</span>
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Oggi</p>
              <p className="text-xl font-bold">{formatDuration(todayMins)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-accent/10 text-accent">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Questa Settimana</p>
              <p className="text-xl font-bold">{formatDuration(weekMins)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted font-medium">Online Adesso</p>
              <p className="text-xl font-bold">{onlineNow.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted font-medium">Sessioni</p>
              <p className="text-xl font-bold">{sessions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online now banner */}
      {onlineNow.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm font-medium text-emerald-700 mb-1">Utenti online adesso</p>
          <div className="flex flex-wrap gap-2">
            {onlineNow.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{s.user.firstName} {s.user.lastName}</span>
                <span className="text-xs text-muted">({formatDuration(s.liveDurationMins)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} label="Dal" className="w-full sm:w-44" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} label="Al" className="w-full sm:w-44" />
        <Select
          label="Utente"
          options={[
            { value: '', label: 'Tutti gli utenti' },
            ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
          ]}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="w-full sm:w-52"
        />
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchSessions()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nessuna sessione trovata"
          description={fromDate || toDate || userFilter ? 'Prova a modificare i filtri.' : 'Le sessioni vengono registrate automaticamente quando un utente accede alla piattaforma.'}
        />
      ) : (
        <div className="space-y-6">
          {groupedSessions.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold capitalize">{group.label}</h3>
                <span className="text-xs text-muted font-medium bg-secondary/60 px-2 py-0.5 rounded-full">
                  Totale: {formatDuration(group.totalMins)}
                </span>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-2">
                {group.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border/80 bg-card p-3 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {s.isActive && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                        <span className="font-medium text-sm truncate">{s.user.firstName} {s.user.lastName}</span>
                      </div>
                      <Badge variant={s.isActive ? 'success' : 'outline'}>
                        {s.isActive ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <LogIn className="h-3.5 w-3.5" />
                          <span>{formatTime(s.clockIn)}</span>
                        </div>
                        <span className="text-muted">-</span>
                        {s.clockOut ? (
                          <div className="flex items-center gap-1 text-muted">
                            <LogOut className="h-3.5 w-3.5" />
                            <span>{formatTime(s.clockOut)}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-xs font-medium">In corso...</span>
                        )}
                      </div>
                      <span className="font-bold text-sm">
                        {formatDuration(s.liveDurationMins || s.durationMins || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80 shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted bg-secondary/40">
                      <th className="py-2.5 px-4 font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => tsHandleSort('userName')}>Utente{tsSortIcon('userName')}</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => tsHandleSort('clockIn')}>Entrata{tsSortIcon('clockIn')}</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => tsHandleSort('clockOut')}>Uscita{tsSortIcon('clockOut')}</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => tsHandleSort('duration')}>Durata{tsSortIcon('duration')}</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider w-24 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => tsHandleSort('isActive')}>Stato{tsSortIcon('isActive')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortData(group.sessions, tsSortKey, tsSortDir, getSessionValue).map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors even:bg-secondary/20">
                        <td className="py-2.5 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            {s.isActive && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                            {s.user.firstName} {s.user.lastName}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <LogIn className="h-3.5 w-3.5" />
                            {formatTime(s.clockIn)}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          {s.clockOut ? (
                            <div className="flex items-center gap-1.5 text-muted">
                              <LogOut className="h-3.5 w-3.5" />
                              {formatTime(s.clockOut)}
                            </div>
                          ) : (
                            <span className="text-emerald-600 text-xs font-medium">In corso...</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold">
                          {formatDuration(s.liveDurationMins || s.durationMins || 0)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={s.isActive ? 'success' : 'outline'}>
                            {s.isActive ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
