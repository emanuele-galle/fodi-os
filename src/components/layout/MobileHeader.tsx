'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers with haptic */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import { haptic } from '@/lib/haptic'

const SECTION_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Task',
  '/chat': 'Chat',
  '/crm': 'CRM',
  '/projects': 'Progetti',
  '/calendar': 'Calendario',
  '/erp': 'Contabilità',
  '/support': 'Supporto',
  '/team': 'Team',
  '/settings': 'Impostazioni',
  '/internal': 'Azienda',
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
    <header className="flex items-center justify-between h-11 px-4 pt-[env(safe-area-inset-top,0px)] bg-background/80 backdrop-blur-2xl saturate-[1.8] border-b border-border/15 md:hidden">
      <div className="flex items-center gap-2 min-w-0">
        {sectionName ? (
          <h1 className="text-[17px] font-semibold truncate">{sectionName}</h1>
        ) : (
          <Link href="/dashboard" className="flex items-center flex-shrink-0">
            <Logo variant="auto" width={80} height={28} />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-0 flex-shrink-0">
        <ThemeSwitcher />

        <button
          onClick={() => { haptic('light'); onOpenSearch() }}
          aria-label="Cerca"
          className="h-11 w-11 flex items-center justify-center active:opacity-50 transition-opacity touch-manipulation"
        >
          <Search className="h-[18px] w-[18px] text-primary" />
        </button>

        <button
          onClick={() => { haptic('light'); onOpenNotifications() }}
          aria-label="Notifiche"
          className="relative h-11 w-11 flex items-center justify-center active:opacity-50 transition-opacity touch-manipulation"
        >
          <Bell className="h-[18px] w-[18px] text-primary" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-[16px] min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold bg-destructive text-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <Link
          href="/settings"
          aria-label="Profilo"
          className="h-11 w-11 flex items-center justify-center touch-manipulation ml-0.5"
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
