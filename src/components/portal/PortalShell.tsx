'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Home, FolderKanban, Ticket, MessageSquare, FileText, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useSSE } from '@/hooks/useSSE'

interface PortalUser {
  id: string
  firstName: string
  lastName: string
  email: string
  client?: { companyName: string } | null
}

const NAV_ITEMS = [
  { href: '/portal', label: 'Home', icon: Home, exact: true },
  { href: '/portal/projects', label: 'Progetti', icon: FolderKanban },
  { href: '/portal/tickets', label: 'Ticket', icon: Ticket },
  { href: '/portal/chat', label: 'Chat', icon: MessageSquare, badgeKey: 'chat' as const },
  { href: '/portal/documents', label: 'Documenti', icon: FileText },
]

export default function PortalShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        if (res.ok) return res.json()
        window.location.href = '/login'
        return null
      })
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {
        window.location.href = '/login'
      })
  }, [])

  // Fetch initial notification count
  useEffect(() => {
    if (!user) return
    fetch('/api/notifications?unreadOnly=true&limit=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.total !== undefined) setUnreadNotifications(data.total)
      })
      .catch(() => {})
  }, [user])

  // Listen for real-time badge updates
  useSSE(
    useCallback((event) => {
      if (event.type === 'badge_update') {
        const data = event.data as { notifications?: number; chat?: number }
        if (data.notifications !== undefined) setUnreadNotifications(data.notifications)
        if (data.chat !== undefined) setUnreadChat(data.chat)
      }
    }, [])
  )

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="auto" width={100} height={35} />
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/portal/notifications')}
              className="relative"
              title="Notifiche"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Button>

            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              {user.client && (
                <p className="text-xs text-muted">{user.client.companyName}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Esci">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <nav className="hidden md:flex flex-col w-52 border-r border-border bg-card p-3 gap-1 shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            const badge = item.badgeKey === 'chat' ? unreadChat : 0
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 md:pb-6">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            const badge = item.badgeKey === 'chat' ? unreadChat : 0
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 relative ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {badge > 0 && (
                  <span className="absolute -top-0.5 right-0 h-3.5 min-w-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[8px] font-medium flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
