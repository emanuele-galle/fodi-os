'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { type Notification, getNotifIcon, NOTIF_TYPE_LABELS } from '@/lib/notification-constants'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

type FilterTab = 'all' | 'unread'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('all')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [limit, setLimit] = useState(30)
  const [hasMore, setHasMore] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (tab === 'unread') params.set('unread', 'true')
      const res = await fetch(`/api/notifications?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items: Notification[] = data.items || []
        setNotifications(items)
        setHasMore(items.length >= limit)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [limit, tab])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  function handleNotificationClick(notif: Notification) {
    if (!notif.isRead) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notif.id] }),
      }).then(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        )
      })
    }
    if (notif.link) {
      router.push(notif.link)
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      }
    } catch {
      // ignore
    }
  }

  function loadMore() {
    setLimit((prev) => prev + 30)
  }

  const filtered = typeFilter
    ? notifications.filter((n) => n.type === typeFilter)
    : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifiche</h1>
          <p className="text-sm text-muted mt-1">
            {unreadCount > 0 ? `${unreadCount} non lette` : 'Tutte lette'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-primary hover:underline font-medium"
          >
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => { setTab('all'); setLimit(30) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            Tutte
          </button>
          <button
            onClick={() => { setTab('unread'); setLimit(30) }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'unread' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            Non lette
          </button>
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border/40 bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tutti i tipi</option>
          {Object.entries(NOTIF_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <Bell className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-base font-medium">Nessuna notifica</p>
          <p className="text-sm mt-1">
            {tab === 'unread' ? 'Nessuna notifica non letta' : 'Non ci sono ancora notifiche'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const NotifIcon = getNotifIcon(notif.type)
            return (
              <Card
                key={notif.id}
                className={`p-4 cursor-pointer hover:bg-secondary/30 transition-colors ${
                  !notif.isRead ? 'border-primary/20 bg-primary/[0.02]' : ''
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                    notif.type.startsWith('reminder') ? 'bg-amber-500/10' : 'bg-secondary/60'
                  }`}>
                    <NotifIcon className="h-4 w-4 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{notif.title}</p>
                        {notif.groupCount > 1 && (
                          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full font-medium text-muted">
                            {notif.groupCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted whitespace-nowrap">
                          {formatDistanceToNow(new Date(notif.updatedAt || notif.createdAt), { locale: it, addSuffix: true })}
                        </span>
                        {!notif.isRead && (
                          <span className="h-2 w-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                    {notif.message && (
                      <p className="text-sm text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                    )}
                    {notif.metadata && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {!!notif.metadata.projectName && (
                          <Badge variant="default" className="text-[11px]">
                            {String(notif.metadata.projectName)}
                          </Badge>
                        )}
                        {!!notif.metadata.clientName && (
                          <Badge variant="success" className="text-[11px]">
                            {String(notif.metadata.clientName)}
                          </Badge>
                        )}
                        {!!notif.metadata.ticketNumber && (
                          <Badge variant="warning" className="text-[11px]">
                            #{String(notif.metadata.ticketNumber)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && hasMore && filtered.length >= limit && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="px-6 py-2 rounded-lg border border-border/40 text-sm text-muted hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            Carica altro
          </button>
        </div>
      )}
    </div>
  )
}
