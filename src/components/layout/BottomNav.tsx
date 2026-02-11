'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Menu,
  X,
  Users,
  FolderKanban,
  CalendarDays,
  Receipt,
  BookOpen,
  Film,
  LifeBuoy,
  UsersRound,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

const TAB_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Task', href: '/tasks', icon: CheckSquare },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Menu', href: '#menu', icon: Menu },
]

const MENU_ITEMS = [
  { label: 'CRM', href: '/crm', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'] as Role[] },
  { label: 'Progetti', href: '/projects', icon: FolderKanban, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'] as Role[] },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays },
  { label: 'Finanze', href: '/erp', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'SALES'] as Role[] },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'] as Role[] },
  { label: 'Contenuti', href: '/content', icon: Film, roles: ['ADMIN', 'MANAGER', 'CONTENT'] as Role[] },
  { label: 'Supporto', href: '/support', icon: LifeBuoy, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'] as Role[] },
  { label: 'Team', href: '/team', icon: UsersRound },
  { label: 'Impostazioni', href: '/settings', icon: Settings },
]

interface BottomNavProps {
  userRole: Role
  unreadChat?: number
}

export function BottomNav({ userRole, unreadChat = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const filteredMenu = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  function isTabActive(href: string): boolean {
    if (href === '#menu') return menuOpen
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function handleTabClick(href: string) {
    if (href === '#menu') {
      setMenuOpen((prev) => !prev)
    } else {
      setMenuOpen(false)
      router.push(href)
    }
  }

  return (
    <>
      {/* Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-card border-t border-border/50 rounded-t-2xl max-h-[60vh] overflow-y-auto z-50 animate-menu-slide-up shadow-[var(--shadow-xl)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-md hover:bg-secondary"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>
            <nav className="py-2">
              {filteredMenu.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm transition-colors touch-manipulation',
                      isActive
                        ? 'text-[#C4A052] bg-gradient-to-r from-primary/10 to-transparent font-medium'
                        : 'text-foreground hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href)
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                onClick={() => handleTabClick(tab.href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-all duration-200 touch-manipulation',
                  active ? 'text-[#C4A052]' : 'text-muted'
                )}
              >
                <div className={cn('relative p-1 rounded-lg transition-all duration-200', active && 'bg-[#C4A052]/10')}>
                  <Icon className="h-5 w-5" />
                  {tab.href === '/chat' && unreadChat > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-0.5 flex items-center justify-center text-[10px] font-bold bg-destructive text-white rounded-full">
                      {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
