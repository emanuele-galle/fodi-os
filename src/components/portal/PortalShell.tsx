'use client'

import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

interface PortalUser {
  firstName: string
  lastName: string
  email: string
  client?: { companyName: string } | null
}

export default function PortalShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<PortalUser | null>(null)

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="auto" width={100} height={35} />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
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

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
