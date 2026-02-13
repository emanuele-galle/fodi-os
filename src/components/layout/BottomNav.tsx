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
import { getEffectiveSectionAccess, HREF_TO_SECTION, type SectionAccessMap } from '@/lib/section-access'

const TAB_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Task', href: '/tasks', icon: CheckSquare },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Menu', href: '#menu', icon: Menu },
]

type CategoryColor = 'indigo' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate'

interface MenuItem {
  label: string
  href: string
  icon: typeof Users
  roles?: Role[]
  category: CategoryColor
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'CRM', href: '/crm', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'] as Role[], category: 'indigo' },
  { label: 'Progetti Clienti', href: '/projects', icon: FolderKanban, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'] as Role[], category: 'emerald' },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays, category: 'violet' },
  { label: 'Contabilita', href: '/erp', icon: Euro, roles: ['ADMIN', 'MANAGER', 'SALES'] as Role[], category: 'amber' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'] as Role[], category: 'rose' },
  { label: 'Contenuti', href: '/content', icon: Film, roles: ['ADMIN', 'MANAGER', 'CONTENT'] as Role[], category: 'violet' },
  { label: 'Supporto', href: '/support', icon: LifeBuoy, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'] as Role[], category: 'rose' },
  { label: 'Team', href: '/team', icon: UsersRound, category: 'indigo' },
  { label: 'Azienda', href: '/internal', icon: Building2, roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SALES', 'CONTENT', 'SUPPORT'] as Role[], category: 'amber' },
  { label: 'Impostazioni', href: '/settings', icon: Settings, category: 'slate' },
]

const CATEGORY_STYLES: Record<CategoryColor, string> = {
  indigo: 'bg-indigo-500/12 text-indigo-500',
  emerald: 'bg-emerald-500/12 text-emerald-500',
  amber: 'bg-amber-500/12 text-amber-600',
  violet: 'bg-violet-500/12 text-violet-500',
  rose: 'bg-rose-500/12 text-rose-500',
  slate: 'bg-slate-500/12 text-slate-500',
}

interface BottomNavProps {
  userRole: Role
  sectionAccess?: SectionAccessMap | null
  unreadChat?: number
}

export function BottomNav({ userRole, sectionAccess, unreadChat = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const currentTranslateY = useRef(0)

  useEffect(() => {
    if (menuOpen) closeMenu()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

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

  const effective = getEffectiveSectionAccess(userRole, sectionAccess)
  const filteredMenu = MENU_ITEMS.filter((item) => {
    const section = HREF_TO_SECTION[item.href]
    if (section) return effective[section]?.view
    return !item.roles || item.roles.includes(userRole)
  })

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
      if (currentTranslateY.current > 80) {
        closeMenu()
      } else {
        sheetRef.current.style.transition = 'transform 0.2s ease-out'
        sheetRef.current.style.transform = ''
        setTimeout(() => {
          if (sheetRef.current) sheetRef.current.style.transition = ''
        }, 200)
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
              'mobile-bottom-sheet absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-card border-t border-border/30 rounded-t-xl max-h-[70vh] overflow-y-auto z-50 shadow-[var(--shadow-xl)]',
              closing ? 'animate-menu-slide-down' : 'animate-menu-slide-up'
            )}
          >
            <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-muted/30" />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <button
                onClick={closeMenu}
                aria-label="Chiudi menu"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/60 active:bg-secondary/80 transition-colors touch-manipulation"
              >
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>

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
                      'flex flex-col items-center gap-2 p-3 rounded-lg transition-all touch-manipulation active:scale-95',
                      isActive
                        ? 'bg-primary/8 ring-1 ring-primary/20'
                        : 'hover:bg-secondary/40 active:bg-secondary/60'
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-lg flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary/15 text-primary' : CATEGORY_STYLES[item.category]
                    )}>
                      <Icon className="h-5 w-5" />
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
      <nav data-bottom-nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-xl border-t border-border/30 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href)
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                onClick={() => handleTabClick(tab.href)}
                aria-label={tab.label}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-all duration-200 touch-manipulation active:scale-95',
                  active ? 'text-primary' : 'text-muted'
                )}
              >
                {/* Active indicator dot */}
                {active && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
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
