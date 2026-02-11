'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          user={user}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
