'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface MobileHeaderProps {
  user: {
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
  unreadCount: number
  onOpenSearch: () => void
  onOpenNotifications: () => void
}

export function MobileHeader({ user, unreadCount, onOpenSearch, onOpenNotifications }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-card border-b border-border/50 md:hidden">
      <Link href="/dashboard" className="flex items-center">
        <Image
          src="/logo-fodi.png"
          alt="FODI"
          width={90}
          height={32}
          priority
        />
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-md hover:bg-secondary transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Search className="h-5 w-5 text-muted" />
        </button>

        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-md hover:bg-secondary transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Bell className="h-5 w-5 text-muted" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
          )}
        </button>

        <Link
          href="/settings"
          className="touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            src={user.avatarUrl}
            size="sm"
          />
        </Link>
      </div>
    </header>
  )
}
