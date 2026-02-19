'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Filter, ChevronLeft, ChevronRight, Download, Clock,
  CheckCircle2, PlusCircle, ListTodo,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface ReportUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
}

interface ReportSummary {
  hoursLogged: number
  billableHours: number
  tasksCompleted: number
  tasksCreated: number
  activeTasks: number
  activityCount: number
}

interface ReportItem {
  id: string
  userId: string
  date: string
  pdfUrl: string
  summary: ReportSummary
  createdAt: string
  user: ReportUser
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Manager', PM: 'PM', DEVELOPER: 'Dev',
  SALES: 'Sales', CONTENT: 'Content', SUPPORT: 'Support',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamReportsPage() {
  const [items, setItems] = useState<ReportItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<ReportUser[]>([])
  const [filter, setFilter] = useState({ userId: '', dateFrom: '', dateTo: '' })

  // Fetch available users for filter
  useEffect(() => {
    fetch('/api/team')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const members = (Array.isArray(data) ? data : data.items || []) as ReportUser[]
        setUsers(members.filter(u => u.role !== 'CLIENT'))
      })
      .catch(() => {})
  }, [])

  const fetchReports = useCallback(async (p: number, f: typeof filter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (f.userId) params.set('userId', f.userId)
      if (f.dateFrom) params.set('dateFrom', f.dateFrom)
      if (f.dateTo) params.set('dateTo', f.dateTo)
      const res = await fetch(`/api/team/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(page, filter)
  }, [page, filter, fetchReports])

  const handleDownload = async (reportId: string) => {
    try {
      const res = await fetch(`/api/team/reports/${reportId}/download`)
      if (res.ok) {
        const data = await res.json()
        if (data.url) window.open(data.url, '_blank')
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Report Giornalieri</h1>
          <p className="text-xs md:text-sm text-muted">Archivio report giornalieri del team con dettaglio ore e attivita</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted flex-shrink-0" />
            <select
              value={filter.userId}
              onChange={(e) => { setPage(1); setFilter(f => ({ ...f, userId: e.target.value })) }}
              className="text-sm bg-secondary border-0 rounded-lg px-3 py-1.5 text-foreground"
            >
              <option value="">Tutti i membri</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => { setPage(1); setFilter(f => ({ ...f, dateFrom: e.target.value })) }}
              className="text-sm bg-secondary border-0 rounded-lg px-3 py-1.5 text-foreground"
              placeholder="Da"
            />
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => { setPage(1); setFilter(f => ({ ...f, dateTo: e.target.value })) }}
              className="text-sm bg-secondary border-0 rounded-lg px-3 py-1.5 text-foreground"
              placeholder="A"
            />
            <span className="ml-auto text-xs text-muted">{total} report</span>
          </div>
        </CardContent>
      </Card>

      {/* Report list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={FileText}
                title="Nessun report"
                description="Non ci sono report giornalieri con i filtri selezionati. I report vengono generati automaticamente ogni sera alle 21:00."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
                >
                  <Avatar
                    src={item.user.avatarUrl}
                    name={`${item.user.firstName} ${item.user.lastName}`}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.user.firstName} {item.user.lastName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[item.user.role] || item.user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDate(item.date)}
                    </p>
                  </div>

                  {/* KPI chips */}
                  <div className="hidden md:flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1" title="Ore loggate">
                      <Clock className="h-3.5 w-3.5" />
                      {item.summary.hoursLogged?.toFixed(1) || '0'}h
                    </span>
                    <span className="flex items-center gap-1 text-emerald-500" title="Task completate">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.summary.tasksCompleted || 0}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500" title="Task create">
                      <PlusCircle className="h-3.5 w-3.5" />
                      {item.summary.tasksCreated || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Task attive">
                      <ListTodo className="h-3.5 w-3.5" />
                      {item.summary.activeTasks || 0}
                    </span>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => handleDownload(item.id)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted hover:text-foreground flex-shrink-0"
                    title="Scarica PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted">
            Pagina {page} di {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
