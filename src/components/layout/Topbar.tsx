'use client'

import { Bell, Search, LogOut, Video } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
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
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shadow-[var(--shadow-sm)] relative z-40">
      {/* Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 h-9 px-4 rounded-full border border-border/50 bg-secondary/50 backdrop-blur-sm text-muted text-sm hover:border-primary/40 hover:bg-secondary/80 transition-all duration-200 w-80"
      >
        <Search className="h-4.5 w-4.5 text-primary" />
        <span>Cerca o premi Cmd+K...</span>
        <kbd className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Quick Meet */}
        <button
          onClick={handleQuickMeet}
          disabled={creatingMeet}
          className="p-2 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
          title="Avvia riunione veloce"
        >
          <Video className="h-5 w-5 text-muted" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-md hover:bg-secondary transition-colors"
            title="Notifiche"
          >
            <Bell className="h-5 w-5 text-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg border border-border/50 shadow-[var(--shadow-xl)] z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-medium">Notifiche</p>
                {unreadCount > 0 && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
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
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors ${
                        !notif.isRead ? 'bg-primary/5' : ''
                      }`}
                    >
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
                    </button>
                  ))
                )}
              </div>
              {unreadCount > 0 && (
                <div className="px-4 py-2 border-t border-border">
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
            className="flex items-center gap-2 hover:bg-secondary rounded-md p-1.5 transition-colors"
            title="Menu utente"
          >
            <Avatar
              name={`${user.firstName} ${user.lastName}`}
              src={user.avatarUrl}
              size="sm"
            />
            <span className="text-sm font-medium">{user.firstName}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg border border-border/50 shadow-[var(--shadow-xl)] py-1 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted">{user.email}</p>
                <span className="text-xs text-primary">{user.role}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors"
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
