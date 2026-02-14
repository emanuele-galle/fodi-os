'use client'

import { Bell, Search, LogOut, Video, MessageSquare, UserCheck, CheckCircle, FileText } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSSE } from '@/hooks/useSSE'

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
}

function getNotifIcon(type: string) {
  return NOTIF_ICONS[type] || Bell
}

interface TopbarProps {
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
    avatarUrl?: string | null
  }
  onOpenCommandPalette: () => void
}

export function Topbar({ user, onOpenCommandPalette }: TopbarProps) {
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [creatingMeet, setCreatingMeet] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications?limit=20')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setNotifications(data.items)
          setUnreadCount(data.unreadCount ?? data.items.filter((n: Notification) => !n.isRead).length)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Real-time notification updates via SSE
  useSSE(useCallback((event) => {
    if (event.type === 'notification') {
      const notif = event.data as Notification
      setNotifications((prev) => [notif, ...prev].slice(0, 20))
      setUnreadCount((c) => c + 1)
    }
  }, []))

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
      setShowNotifications(false)
      router.push(notif.link)
    }
  }

  const handleQuickMeet = async () => {
    if (creatingMeet) return
    setCreatingMeet(true)
    try {
      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: 'Riunione veloce' }),
      })
      if (res.ok) {
        const data = await res.json()
        window.open(data.meetLink, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setCreatingMeet(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <header className="h-16 glass-header flex items-center justify-between px-6 relative z-40">
      {/* Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="group flex items-center gap-2 h-9 px-4 rounded-lg border border-border/30 bg-secondary/30 text-muted text-sm hover:border-primary/30 hover:bg-secondary/50 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 flex-1 max-w-96"
      >
        <Search className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
        <span>Cerca o premi Cmd+K...</span>
        <kbd className="ml-auto text-[10px] font-medium bg-secondary/80 px-1.5 py-0.5 rounded border border-border/40">Cmd+K</kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <ThemeSwitcher />

        {/* Quick Meet */}
        <button
          onClick={handleQuickMeet}
          disabled={creatingMeet}
          className="p-2 rounded-lg hover:bg-secondary/60 transition-all duration-200 disabled:opacity-50"
          title="Avvia riunione veloce"
          aria-label="Riunione veloce"
        >
          <Video className="h-[18px] w-[18px] text-muted" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-secondary/60 transition-all duration-200"
            title="Notifiche"
            aria-label="Notifiche"
          >
            <Bell className="h-[18px] w-[18px] text-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive ring-2 ring-card rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border/40 rounded-xl shadow-[var(--shadow-xl)] z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <p className="text-sm font-medium">Notifiche</p>
                {unreadCount > 0 && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-md font-medium">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">
                    Nessuna notifica
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const NotifIcon = getNotifIcon(notif.type)
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 border-b border-border/20 last:border-b-0 hover:bg-secondary/40 transition-colors ${
                          !notif.isRead ? 'bg-primary/[0.03]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1.5 rounded-md bg-secondary/60 shrink-0">
                            <NotifIcon className="h-3.5 w-3.5 text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{notif.title}</p>
                              {!notif.isRead && (
                                <span className="mt-1 h-2 w-2 shrink-0 bg-primary rounded-full" />
                              )}
                            </div>
                            {notif.message && (
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                            )}
                            <p className="text-xs text-muted mt-1">
                              {formatDistanceToNow(new Date(notif.createdAt), { locale: it, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              {unreadCount > 0 && (
                <div className="px-4 py-2 border-t border-border/30">
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline w-full text-center"
                  >
                    Segna tutte come lette
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-secondary/50 rounded-lg p-1.5 transition-all duration-200"
            title="Menu utente"
            aria-label="Profilo utente"
          >
            <span className="ring-2 ring-primary/15 rounded-full">
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                src={user.avatarUrl}
                size="sm"
              />
            </span>
            <span className="text-sm font-medium">{user.firstName}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border/40 rounded-xl shadow-[var(--shadow-xl)] py-1 z-50 animate-scale-in">
              <div className="px-4 py-2.5 border-b border-border/30">
                <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted">{user.email}</p>
                <span className="text-xs text-primary">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
