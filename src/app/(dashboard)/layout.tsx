'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { useState, useEffect } from 'react'
import { useAuthRefresh } from '@/hooks/useAuthRefresh'
import type { Role } from '@/generated/prisma/client'

interface UserSession {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  avatarUrl?: string | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)

  // Proactive token refresh: prevents auto-logout
  useAuthRefresh()

  useEffect(() => {
    async function loadSession() {
      let res = await fetch('/api/auth/session')

      // If 401, try refresh then retry
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
        if (refreshRes.ok) {
          res = await fetch('/api/auth/session')
        }
      }

      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          setUser(data.user)
          return
        }
      }

      window.location.href = '/login'
    }
    loadSession()
  }, [])

  // Fetch unread counts for mobile badges
  useEffect(() => {
    function fetchCounts() {
      fetch('/api/notifications?limit=1')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.unreadCount !== undefined) setUnreadNotifications(data.unreadCount)
        })
        .catch(() => {})

      fetch('/api/chat/channels')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          const channels = data?.items || []
          setUnreadChat(channels.filter((c: { hasUnread: boolean }) => c.hasUnread).length)
        })
        .catch(() => {})
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/20 shimmer" />
        <div className="text-sm text-muted animate-pulse">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar: hidden on mobile, visible on md+ */}
      <div className="hidden md:flex">
        <Sidebar userRole={user.role} />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* MobileHeader: visible only on mobile */}
        <MobileHeader
          user={user}
          unreadCount={unreadNotifications}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => {}}
        />

        {/* Topbar: hidden on mobile, visible on md+ */}
        <div className="hidden md:block relative z-40">
          <Topbar
            user={user}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>

      {/* BottomNav: visible only on mobile */}
      <BottomNav userRole={user.role} unreadChat={unreadChat} />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
