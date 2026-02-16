'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, FileText, Filter, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, Archive, LogIn, LogOut,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface ActivityItem {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: string
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  CREATE: { label: 'Creazione', icon: Plus, color: 'text-emerald-500' },
  UPDATE: { label: 'Modifica', icon: Pencil, color: 'text-blue-500' },
  DELETE: { label: 'Eliminazione', icon: Trash2, color: 'text-red-500' },
  ARCHIVE: { label: 'Archiviazione', icon: Archive, color: 'text-amber-500' },
  LOGIN: { label: 'Login', icon: LogIn, color: 'text-indigo-500' },
  LOGOUT: { label: 'Logout', icon: LogOut, color: 'text-slate-500' },
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  AUTH: 'Autenticazione',
  CLIENT: 'Cliente',
  PROJECT: 'Progetto',
  TASK: 'Task',
  INVOICE: 'Fattura',
  QUOTE: 'Preventivo',
  EXPENSE: 'Spesa',
  WIKI: 'Wiki',
  TICKET: 'Ticket',
  USER: 'Utente',
  MEETING: 'Meeting',
  CHAT: 'Chat',
}

function getEntityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'CLIENT': return `/crm/${entityId}`
    case 'PROJECT': return `/projects/${entityId}`
    case 'TASK': return `/tasks?taskId=${entityId}`
    case 'INVOICE':
    case 'QUOTE': return `/erp/quotes/${entityId}`
    case 'EXPENSE': return `/erp/expenses`
    case 'TICKET': return `/support/${entityId}`
    case 'WIKI': return `/internal/wiki/${entityId}`
    case 'MEETING': return `/team/meetings/${entityId}`
    case 'USER': return `/team`
    case 'CHAT': return `/chat`
    default: return null
  }
}

export default function TeamActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ entityType: string; action: string }>({ entityType: '', action: '' })
  const router = useRouter()

  const fetchActivity = useCallback(async (p: number, f: { entityType: string; action: string }) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (f.entityType) params.set('entityType', f.entityType)
      if (f.action) params.set('action', f.action)
      const res = await fetch(`/api/activity?${params}`)
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
    fetchActivity(page, filter)
  }, [page, filter, fetchActivity])

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Log Attività</h1>
          <p className="text-xs md:text-sm text-muted">Tutte le azioni del team in tempo reale</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted flex-shrink-0" />
            <select
              value={filter.entityType}
              onChange={(e) => { setPage(1); setFilter((f) => ({ ...f, entityType: e.target.value })) }}
              className="text-sm bg-secondary border-0 rounded-lg px-3 py-1.5 text-foreground"
            >
              <option value="">Tutti i tipi</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={filter.action}
              onChange={(e) => { setPage(1); setFilter((f) => ({ ...f, action: e.target.value })) }}
              className="text-sm bg-secondary border-0 rounded-lg px-3 py-1.5 text-foreground"
            >
              <option value="">Tutte le azioni</option>
              {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <span className="ml-auto text-xs text-muted">{total} risultati</span>
          </div>
        </CardContent>
      </Card>

      {/* Activity list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Activity}
                title="Nessuna attività"
                description="Non ci sono attività registrate con i filtri selezionati."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => {
                const config = ACTION_CONFIG[item.action] || { label: item.action, icon: Activity, color: 'text-muted' }
                const ActionIcon = config.icon
                const link = getEntityLink(item.entityType, item.entityId)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors ${link ? 'cursor-pointer' : ''}`}
                    onClick={() => link && router.push(link)}
                  >
                    <div className={`p-1.5 rounded-lg bg-secondary/80 ${config.color} flex-shrink-0`}>
                      <ActionIcon className="h-3.5 w-3.5" />
                    </div>
                    <Avatar
                      src={item.user.avatarUrl}
                      name={`${item.user.firstName} ${item.user.lastName}`}
                      size="xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{item.user.firstName} {item.user.lastName}</span>
                        {' '}
                        <span className="text-muted">{config.label.toLowerCase()}</span>
                        {' '}
                        <Badge variant="outline" className="text-[10px] mx-0.5">
                          {ENTITY_TYPE_LABELS[item.entityType] || item.entityType}
                        </Badge>
                        {item.metadata && item.metadata.companyName && (
                          <span className="text-muted"> — {String(item.metadata.companyName)}</span>
                        )}
                        {item.metadata && item.metadata.name && (
                          <span className="text-muted"> — {String(item.metadata.name)}</span>
                        )}
                        {item.metadata && item.metadata.number && (
                          <span className="text-muted"> — #{String(item.metadata.number)}</span>
                        )}
                        {item.metadata && item.metadata.ip && (
                          <span className="text-muted text-xs font-mono ml-1">({String(item.metadata.ip)})</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: it })}
                    </span>
                    {link && <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted">
            Pagina {page} di {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
