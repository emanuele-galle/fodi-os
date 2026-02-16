'use client'

import { Bell, X, MessageSquare, UserCheck, CheckCircle, FileText, Video, AlarmClock, Clock, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

const NOTIF_ICONS: Record<string, typeof Bell> = {
  task_comment: MessageSquare,
  ticket_comment: MessageSquare,
  task_assigned: UserCheck,
  task_completed: CheckCircle,
  task_status_changed: CheckCircle,
  MEETING: Video,
  file_uploaded: FileText,
  task_overdue: AlertTriangle,
  task_due_today: Clock,
  task_due_tomorrow: AlarmClock,
}

interface MobileNotificationsPanelProps {
  onClose: () => void
}

export function MobileNotificationsPanel({ onClose }: MobileNotificationsPanelProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications?limit=30')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setNotifications(data.items)
          setUnreadCount(data.unreadCount ?? data.items.filter((n: Notification) => !n.isRead).length)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function markAllAsRead() {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch {}
  }

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
        setUnreadCount((c) => Math.max(0, c - 1))
      })
    }
    if (notif.link) {
      onClose()
      router.push(notif.link)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel - slides up from bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground" />
            <h2 className="text-base font-semibold">Notifiche</h2>
            {unreadCount > 0 && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-lg flex items-center justify-center hover:bg-secondary/60 active:bg-secondary/80 transition-colors touch-manipulation"
            aria-label="Chiudi notifiche"
          >
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-secondary/60 shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-secondary/60 shimmer" />
                    <div className="h-3 w-1/2 rounded bg-secondary/40 shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Nessuna notifica</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {notifications.map((notif) => {
                const NotifIcon = NOTIF_ICONS[notif.type] || Bell
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-secondary/40 transition-colors touch-manipulation ${
                      !notif.isRead ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    <div className="mt-0.5 p-2 rounded-lg bg-secondary/60 shrink-0">
                      <NotifIcon className="h-4 w-4 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{notif.title}</p>
                        {!notif.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 bg-primary rounded-full" />
                        )}
                      </div>
                      {notif.message && (
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      <p className="text-xs text-muted/70 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { locale: it, addSuffix: true })}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {unreadCount > 0 && (
          <div className="px-4 py-3 border-t border-border/30 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              onClick={markAllAsRead}
              className="w-full h-11 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 active:bg-primary/20 transition-colors touch-manipulation"
            >
              Segna tutte come lette
            </button>
          </div>
        )}
        {unreadCount === 0 && (
          <div className="pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>
  )
}
