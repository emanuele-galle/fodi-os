'use client'

import { Bell, Search, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Notification {
  id: string
  title: string
  message: string | null
  readAt: string | null
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
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

  useEffect(() => {
    fetch('/api/notifications?limit=10')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) setNotifications(data.items)
        else if (Array.isArray(data)) setNotifications(data)
      })
      .catch(() => {})
  }, [])

  const unreadCount = notifications.filter((n) => n.readAt === null).length

  async function markAllAsRead() {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
        )
      }
    } catch {}
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <header className="h-16 bg-card flex items-center justify-between px-6" style={{ borderBottom: '1px solid transparent', borderImage: 'linear-gradient(to right, #C4A052 0%, #E2E8F0 30%, transparent 100%) 1' }}>
      {/* Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 h-9 px-4 rounded-full border border-border bg-background text-muted text-sm hover:border-primary/50 transition-colors w-80"
      >
        <Search className="h-4.5 w-4.5 text-primary" />
        <span>Cerca o premi Cmd+K...</span>
        <kbd className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-md hover:bg-secondary transition-colors"
            title="Notifiche"
          >
            <Bell className="h-5 w-5 text-muted" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg border border-border shadow-lg z-50">
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
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-border last:border-b-0 ${
                        notif.readAt === null ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{notif.title}</p>
                        {notif.readAt === null && (
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
            <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg border border-border shadow-lg py-1 z-50">
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
