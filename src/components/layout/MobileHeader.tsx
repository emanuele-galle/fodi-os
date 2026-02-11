'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'

const SECTION_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Task',
  '/chat': 'Chat',
  '/crm': 'CRM',
  '/projects': 'Progetti',
  '/calendar': 'Calendario',
  '/erp': 'Contabilità',
  '/kb': 'Knowledge Base',
  '/content': 'Contenuti',
  '/support': 'Supporto',
  '/team': 'Team',
  '/settings': 'Impostazioni',
}

function getCurrentSection(pathname: string): string | null {
  for (const [path, name] of Object.entries(SECTION_NAMES)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return name
    }
  }
  return null
}

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
  const pathname = usePathname()
  const sectionName = getCurrentSection(pathname)

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-card/80 backdrop-blur-md border-b border-border/30 md:hidden">
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard" className="flex items-center">
          <Logo variant="auto" width={90} height={32} />
        </Link>
        {sectionName && (
          <>
            <span className="text-border/60 text-sm">/</span>
            <span className="text-sm font-medium text-foreground/80 truncate max-w-[120px]">
              {sectionName}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSearch}
          className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors touch-manipulation"
        >
          <Search className="h-[18px] w-[18px] text-muted" />
        </button>

        <button
          onClick={onOpenNotifications}
          className="relative h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors touch-manipulation"
        >
          <Bell className="h-[18px] w-[18px] text-muted" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <Link
          href="/settings"
          className="h-10 w-10 rounded-full flex items-center justify-center touch-manipulation"
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
