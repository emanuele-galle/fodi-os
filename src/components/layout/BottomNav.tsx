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
  LifeBuoy,
  UsersRound,
  Building2,
  Settings,
  Bot,
  Bell,
  Library,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
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
  { label: 'Assistente AI', href: '/ai', icon: Bot, category: 'violet' },
  { label: 'Notifiche', href: '/notifications', icon: Bell, category: 'rose' },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays, category: 'violet' },
  { label: 'CRM', href: '/crm', icon: Users, roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'SUPPORT'] as Role[], category: 'indigo' },
  { label: 'Progetti', href: '/projects', icon: FolderKanban, roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT'] as Role[], category: 'emerald' },
  { label: 'Contabilità', href: '/erp', icon: Euro, roles: ['ADMIN', 'DIR_COMMERCIALE', 'COMMERCIALE'] as Role[], category: 'amber' },
  { label: 'Supporto', href: '/support', icon: LifeBuoy, roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM', 'DEVELOPER', 'SUPPORT'] as Role[], category: 'rose' },
  { label: 'Team', href: '/team', icon: UsersRound, category: 'indigo' },
  { label: 'Knowledge Base', href: '/kb', icon: Library, roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'] as Role[], category: 'emerald' },
  { label: 'Azienda', href: '/internal', icon: Building2, roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'] as Role[], category: 'amber' },
  { label: 'Guida', href: '/guide', icon: BookOpen, category: 'slate' },
  { label: 'Impostazioni', href: '/settings', icon: Settings, category: 'slate' },
]

const CATEGORY_STYLES: Record<CategoryColor, string> = {
  indigo: 'bg-indigo-400/20 text-indigo-400',
  emerald: 'bg-emerald-400/20 text-emerald-400',
  amber: 'bg-amber-400/20 text-amber-400',
  violet: 'bg-blue-400/20 text-blue-400',
  rose: 'bg-rose-400/20 text-rose-400',
  slate: 'bg-slate-400/20 text-slate-400',
}

interface BottomNavProps {
  userRole: Role
  sectionAccess?: SectionAccessMap | null
  customRoleSectionAccess?: SectionAccessMap | null
  unreadChat?: number
}

export function BottomNav({ userRole, sectionAccess, customRoleSectionAccess, unreadChat = 0 }: BottomNavProps) {
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

  const effective = getEffectiveSectionAccess(userRole, sectionAccess, customRoleSectionAccess)
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
    haptic('selection')
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
              'absolute inset-0 bg-black/30 backdrop-blur-xl transition-opacity duration-250',
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
              'mobile-bottom-sheet absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-[var(--color-sheet)] border-t border-[var(--color-sheet-border)] rounded-t-xl max-h-[70vh] overflow-y-auto z-50 shadow-[var(--shadow-xl)]',
              closing ? 'animate-menu-slide-down' : 'animate-menu-slide-up'
            )}
          >
            <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-[var(--color-sheet-muted)]/40" />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-sheet-border)]">
              <span className="text-sm font-semibold text-[var(--color-sheet-foreground)]">Menu</span>
              <button
                onClick={closeMenu}
                aria-label="Chiudi menu"
                className="h-11 w-11 rounded-full flex items-center justify-center hover:bg-[var(--color-sheet-border)] active:bg-[var(--color-sheet-border)] transition-colors touch-manipulation"
              >
                <X className="h-4 w-4 text-[var(--color-sheet-muted)]" />
              </button>
            </div>

            <nav className="p-4 grid grid-cols-4 gap-x-2 gap-y-4">
              {filteredMenu.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- loop handler
                    onClick={() => { haptic('selection'); closeMenu() }}
                    className="ios-press flex flex-col items-center gap-1.5 touch-manipulation"
                  >
                    <div className={cn(
                      'w-[52px] h-[52px] rounded-[14px] flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary text-white' : CATEGORY_STYLES[item.category]
                    )}>
                      <Icon className="h-[22px] w-[22px]" />
                    </div>
                    <span className={cn(
                      'text-xs font-medium text-center leading-tight max-w-[64px]',
                      isActive ? 'text-primary' : 'text-[var(--color-sheet-foreground)]/80'
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
      <nav data-bottom-nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-sheet)] backdrop-blur-2xl saturate-[var(--glass-saturation)] border-t border-[var(--color-sheet-border)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-[50px]">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href)
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                onClick={() => handleTabClick(tab.href)} // eslint-disable-line react-perf/jsx-no-new-function-as-prop -- loop handler
                aria-label={tab.label}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors duration-150 touch-manipulation active:opacity-60',
                  active ? 'text-primary' : 'text-muted'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-[22px] w-[22px]', active && 'stroke-[2.2]')} />
                  {tab.href === '/chat' && unreadChat > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-[16px] min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold bg-destructive text-white rounded-full">
                      {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] leading-tight', active ? 'font-semibold' : 'font-medium')}>
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
