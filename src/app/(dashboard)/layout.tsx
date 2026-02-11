'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { useState, useEffect } from 'react'
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

  // Fetch unread counts for mobile badges
  useEffect(() => {
    fetch('/api/notifications?limit=50')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const items = data?.items || (Array.isArray(data) ? data : [])
        setUnreadNotifications(items.filter((n: { readAt: string | null }) => n.readAt === null).length)
      })
      .catch(() => {})

    fetch('/api/chat/channels')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const channels = data?.items || []
        setUnreadChat(channels.filter((c: { hasUnread: boolean }) => c.hasUnread).length)
      })
      .catch(() => {})
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
    <div className="min-h-screen flex bg-background">
      {/* Sidebar: hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar userRole={user.role} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* MobileHeader: visible only on mobile */}
        <MobileHeader
          user={user}
          unreadCount={unreadNotifications}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => {}}
        />

        {/* Topbar: hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
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
