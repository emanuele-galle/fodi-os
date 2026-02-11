'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Menu,
  X,
  Users,
  FolderKanban,
  CalendarDays,
  Euro,
  BookOpen,
  Film,
  LifeBuoy,
  UsersRound,
  Building2,
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

type CategoryColor = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'slate'

interface MenuItem {
  label: string
  href: string
  icon: typeof Users
  roles?: Role[]
  category: CategoryColor
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'CRM', href: '/crm', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'] as Role[], category: 'blue' },
  { label: 'Progetti', href: '/projects', icon: FolderKanban, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'] as Role[], category: 'green' },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays, category: 'purple' },
  { label: 'Finanze', href: '/erp', icon: Euro, roles: ['ADMIN', 'MANAGER', 'SALES'] as Role[], category: 'amber' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'] as Role[], category: 'rose' },
  { label: 'Contenuti', href: '/content', icon: Film, roles: ['ADMIN', 'MANAGER', 'CONTENT'] as Role[], category: 'purple' },
  { label: 'Supporto', href: '/support', icon: LifeBuoy, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'] as Role[], category: 'rose' },
  { label: 'Team', href: '/team', icon: UsersRound, category: 'blue' },
  { label: 'Azienda', href: '/internal', icon: Building2, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SALES', 'CONTENT', 'SUPPORT'] as Role[], category: 'amber' },
  { label: 'Impostazioni', href: '/settings', icon: Settings, category: 'slate' },
]

const CATEGORY_STYLES: Record<CategoryColor, string> = {
  blue: 'bg-blue-500/15 text-blue-600 [data-theme="dark"]_&:bg-blue-400/20 [data-theme="dark"]_&:text-blue-400',
  green: 'bg-emerald-500/15 text-emerald-600',
  amber: 'bg-amber-500/15 text-amber-600',
  purple: 'bg-purple-500/15 text-purple-600',
  rose: 'bg-rose-500/15 text-rose-600',
  slate: 'bg-slate-500/15 text-slate-600',
}

interface BottomNavProps {
  userRole: Role
  unreadChat?: number
}

export function BottomNav({ userRole, unreadChat = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const currentTranslateY = useRef(0)

  // Close menu on route change
  useEffect(() => {
    if (menuOpen) closeMenu()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const closeMenu = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setMenuOpen(false)
      setClosing(false)
    }, 250)
  }, [])

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
      if (menuOpen) {
        closeMenu()
      } else {
        setMenuOpen(true)
      }
    } else {
      if (menuOpen) closeMenu()
      router.push(href)
    }
  }

  // Drag-to-dismiss handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    currentTranslateY.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - dragStartY.current
    if (deltaY > 0 && sheetRef.current) {
      currentTranslateY.current = deltaY
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (sheetRef.current) {
      if (currentTranslateY.current > 100) {
        closeMenu()
      } else {
        sheetRef.current.style.transform = ''
      }
      currentTranslateY.current = 0
    }
  }, [closeMenu])

  return (
    <>
      {/* Bottom Sheet Overlay */}
      {(menuOpen || closing) && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className={cn(
              'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-250',
              closing ? 'opacity-0' : 'opacity-100'
            )}
            onClick={closeMenu}
          />
          <div
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              'mobile-bottom-sheet absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 rounded-t-2xl max-h-[70vh] overflow-y-auto z-50 shadow-[var(--shadow-xl)]',
              closing ? 'animate-menu-slide-down' : 'animate-menu-slide-up'
            )}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted/50" />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <button
                onClick={closeMenu}
                className="p-1.5 rounded-full hover:bg-secondary/60 transition-colors touch-manipulation"
              >
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>

            {/* Grid menu */}
            <nav className="p-4 grid grid-cols-3 gap-3">
              {filteredMenu.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-all touch-manipulation active:scale-95',
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-secondary/50 active:bg-secondary/70'
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary/20 text-primary' : CATEGORY_STYLES[item.category]
                    )}>
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                    <span className={cn(
                      'text-xs font-medium text-center leading-tight',
                      isActive ? 'text-primary' : 'text-foreground'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/50 shadow-[var(--shadow-lg)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href)
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                onClick={() => handleTabClick(tab.href)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-all duration-200 touch-manipulation active:scale-95',
                  active ? 'text-primary' : 'text-muted'
                )}
              >
                {/* Active indicator line */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}

                <div className="relative p-1">
                  <Icon className={cn('h-5 w-5 transition-all', active && 'stroke-[2.5]')} />
                  {tab.href === '/chat' && unreadChat > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-white rounded-full animate-pulse">
                      {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] transition-all', active ? 'font-semibold' : 'font-medium')}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
