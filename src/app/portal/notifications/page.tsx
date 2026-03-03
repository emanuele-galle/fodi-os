'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  MessageSquare,
  FolderKanban,
  FileText,
  CheckCheck,
  Ticket,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

function relativeTime(dateStr: string) {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Adesso'
  if (mins < 60) return `${mins} min fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} or${hours === 1 ? 'a' : 'e'} fa`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} giorn${days === 1 ? 'o' : 'i'} fa`
  return new Date(dateStr).toLocaleDateString('it-IT')
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
  updatedAt: string
  metadata: Record<string, unknown> | null
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  ticket_comment: MessageSquare,
  ticket_status_changed: Ticket,
  project_status_changed: FolderKanban,
  document_shared: FileText,
  chat_message: MessageSquare,
}

const TABS = [
  { label: 'Tutte', value: '' },
  { label: 'Non lette', value: 'unread' },
]

export default function PortalNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  const fetchNotifications = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (activeTab === 'unread') params.set('unread', 'true')
    fetch(`/api/notifications?${params}`)
      .then((r) => (r.ok ? r.json() : { items: [], unreadCount: 0 }))
      .then((data) => {
        setNotifications(data.items || [])
        setUnreadCount(data.unreadCount ?? 0)
      })
      .finally(() => setLoading(false))
  }, [activeTab])

  useEffect(() => {
    fetchNotifications() // eslint-disable-line react-hooks/set-state-in-effect -- loading state set inside fetch callback, not a cascading render risk
  }, [fetchNotifications])

  useRealtimeRefresh('notification', fetchNotifications)

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    fetchNotifications()
  }

  async function handleClick(notification: Notification) {
    if (!notification.isRead) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      })
    }
    if (notification.link) {
      // Rewrite internal dashboard links to portal links
      const link = notification.link.startsWith('/support/')
        ? notification.link.replace('/support/', '/portal/tickets/')
        : notification.link
      router.push(link)
    }
    fetchNotifications()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifiche</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted mt-1">
              {unreadCount} non lett{unreadCount === 1 ? 'a' : 'e'}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Segna tutte come lette
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-secondary/50 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nessuna notifica"
          description={
            activeTab === 'unread'
              ? 'Sei in pari! Nessuna notifica non letta.'
              : 'Non hai ancora ricevuto notifiche.'
          }
        />
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  n.isRead
                    ? 'hover:bg-secondary/50'
                    : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                <div
                  className={`p-2 rounded-full shrink-0 mt-0.5 ${
                    n.isRead ? 'bg-secondary' : 'bg-primary/10'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${n.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${n.isRead ? '' : 'font-semibold'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
