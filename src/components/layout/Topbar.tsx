'use client'

import { Bell, Search, LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useState, useRef, useEffect } from 'react'

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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Search trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-muted text-sm hover:border-primary/50 transition-colors w-80"
      >
        <Search className="h-4 w-4" />
        <span>Cerca o premi Cmd+K...</span>
        <kbd className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5 text-muted" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-secondary rounded-md p-1.5 transition-colors"
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
