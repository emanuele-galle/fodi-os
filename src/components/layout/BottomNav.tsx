'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- loop handlers with dynamic keys */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
import type { Role } from '@/generated/prisma/client'
import { getEffectiveSectionAccess, HREF_TO_SECTION, type SectionAccessMap } from '@/lib/section-access'
import { navigation, GROUP_ORDER, GROUP_LABELS, type NavItem, type NavGroup } from '@/lib/navigation'

const TAB_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Task', href: '/tasks', icon: CheckSquare },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Menu', href: '#menu', icon: Menu },
]

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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
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
      setExpandedItems(new Set())
    }, 250)
  }, [])

  const effective = getEffectiveSectionAccess(userRole, sectionAccess, customRoleSectionAccess)

  // Filter navigation items, excluding those already in TAB_ITEMS (Dashboard, Tasks, Chat)
  const tabHrefs = new Set(TAB_ITEMS.filter(t => t.href !== '#menu').map(t => t.href))
  const filteredNav = navigation.filter((item) => {
    if (tabHrefs.has(item.href)) return false
    const section = HREF_TO_SECTION[item.href]
    if (section) return effective[section]?.view
    return !item.roles || item.roles.includes(userRole)
  })

  // Group items
  const grouped = new Map<NavGroup, NavItem[]>()
  for (const item of filteredNav) {
    const list = grouped.get(item.group) || []
    list.push(item)
    grouped.set(item.group, list)
  }

  function isTabActive(href: string): boolean {
    if (href === '#menu') return menuOpen
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const toggleExpanded = useCallback((label: string) => {
    haptic('selection')
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }, [])

  const handleLogout = useCallback(async () => {
    haptic('selection')
    closeMenu()
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }, [closeMenu])

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
              'mobile-bottom-sheet absolute bottom-[calc(50px+max(env(safe-area-inset-bottom,0px),8px))] left-0 right-0 bg-[var(--color-sheet)] border-t border-[var(--color-sheet-border)] rounded-t-xl max-h-[70vh] overflow-y-auto z-50 shadow-[var(--shadow-xl)]',
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

            {/* Grouped accordion navigation */}
            <nav className="py-2">
              {GROUP_ORDER.filter((g) => grouped.has(g)).map((group, groupIndex) => {
                const items = grouped.get(group)!
                const groupLabel = GROUP_LABELS[group]
                return (
                  <div key={group}>
                    {groupIndex > 0 && (
                      <div className="h-px bg-[var(--color-sheet-border)] mx-4 my-1.5" />
                    )}
                    {groupLabel && (
                      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-sheet-muted)]">
                        {groupLabel}
                      </div>
                    )}
                    {items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      const Icon = item.icon
                      const isExpanded = expandedItems.has(item.label)

                      return (
                        <div key={item.label}>
                          {item.children ? (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleExpanded(item.label)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-4 py-2.5 transition-colors touch-manipulation active:bg-[var(--color-sheet-border)]',
                                  isActive ? 'text-primary' : 'text-[var(--color-sheet-foreground)]'
                                )}
                              >
                                <Icon className="h-[20px] w-[20px] flex-shrink-0" />
                                <span className="flex-1 text-left text-[15px] font-medium">{item.label}</span>
                                <ChevronRight className={cn(
                                  'h-4 w-4 text-[var(--color-sheet-muted)] transition-transform duration-200',
                                  isExpanded && 'rotate-90'
                                )} />
                              </button>
                              {isExpanded && (
                                <div className="ml-11 mr-4 mb-1">
                                  {item.children.map((child) => {
                                    const childActive = pathname === child.href
                                    return (
                                      <Link
                                        key={child.href}
                                        href={child.href}
                                        onClick={() => { haptic('selection'); closeMenu() }}
                                        className={cn(
                                          'flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] transition-colors touch-manipulation active:bg-[var(--color-sheet-border)]',
                                          childActive
                                            ? 'text-primary font-medium bg-primary/8'
                                            : 'text-[var(--color-sheet-foreground)]/70'
                                        )}
                                      >
                                        <span className={cn(
                                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                          childActive ? 'bg-primary' : 'bg-[var(--color-sheet-muted)]/40'
                                        )} />
                                        {child.label}
                                      </Link>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => { haptic('selection'); closeMenu() }}
                              className={cn(
                                'flex items-center gap-3 px-4 py-2.5 transition-colors touch-manipulation active:bg-[var(--color-sheet-border)]',
                                isActive ? 'text-primary' : 'text-[var(--color-sheet-foreground)]'
                              )}
                            >
                              <Icon className="h-[20px] w-[20px] flex-shrink-0" />
                              <span className="text-[15px] font-medium">{item.label}</span>
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </nav>

            <div className="px-4 pb-4 pt-2 border-t border-[var(--color-sheet-border)]">
              <button
                onClick={handleLogout}
                className="ios-press flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 active:bg-destructive/15 transition-colors touch-manipulation"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span className="text-sm font-medium">Esci</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav data-bottom-nav aria-label="Navigazione inferiore" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-sheet)] backdrop-blur-2xl saturate-[var(--glass-saturation)] border-t border-[var(--color-sheet-border)] pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <div className="flex items-center justify-around h-[50px]">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href)
            const Icon = tab.icon
            return (
              <button
                key={tab.href}
                onClick={() => handleTabClick(tab.href)}
                aria-label={tab.label}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors duration-150 touch-manipulation active:opacity-60',
                  active ? 'text-primary' : 'text-muted'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-[22px] w-[22px]', active && 'stroke-[2.2]')} />
                  {tab.href === '/chat' && unreadChat > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-[16px] min-w-[16px] px-1 flex items-center justify-center text-[11px] font-bold bg-destructive text-white rounded-full">
                      {unreadChat > 9 ? '9+' : unreadChat}
                    </span>
                  )}
                </div>
                <span className={cn('text-[11px] leading-tight', active ? 'font-semibold' : 'font-medium')}>
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
