'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Role } from '@/generated/prisma/client'
import { Tooltip } from '@/components/ui/Tooltip'
import { Logo } from '@/components/ui/Logo'
import { getEffectiveSectionAccess, HREF_TO_SECTION, type SectionAccessMap } from '@/lib/section-access'
import { navigation, GROUP_ORDER, type NavItem, type NavGroup } from '@/lib/navigation'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- item.label is dynamic from map iteration */

// Hoisted animation objects
const FLYOUT_INITIAL = { opacity: 0, x: -8, scale: 0.96 }
const FLYOUT_ANIMATE = { opacity: 1, x: 0, scale: 1 }
const FLYOUT_EXIT = { opacity: 0, x: -8, scale: 0.96 }
const FLYOUT_TRANSITION = { duration: 0.15 }

interface TabletSidebarProps {
  userRole: Role
  sectionAccess?: SectionAccessMap | null
  customRoleSectionAccess?: SectionAccessMap | null
  unreadChat?: number
  pendingTaskCount?: number
  unreadNotifications?: number
}

export function TabletSidebar({ userRole, sectionAccess, customRoleSectionAccess, unreadChat = 0, pendingTaskCount = 0, unreadNotifications = 0 }: TabletSidebarProps) {
  const pathname = usePathname()
  const [flyoutItem, setFlyoutItem] = useState<string | null>(null)
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const effective = getEffectiveSectionAccess(userRole, sectionAccess, customRoleSectionAccess)
  const filteredNav = navigation.filter((item) => {
    const section = HREF_TO_SECTION[item.href]
    if (section) return effective[section]?.view
    return !item.roles || item.roles.includes(userRole)
  })

  const openFlyout = useCallback((label: string) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
    setFlyoutItem(label)
  }, [])

  const closeFlyout = useCallback(() => {
    flyoutTimeoutRef.current = setTimeout(() => setFlyoutItem(null), 150)
  }, [])

  const cancelClose = useCallback(() => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
  }, [])

  // Close flyout on route change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on route change
  useEffect(() => { setFlyoutItem(null) }, [pathname])

  // Close flyout on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setFlyoutItem(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function getBadgeCount(item: NavItem): number {
    if (item.label === 'Chat') return unreadChat
    if (item.label === 'I Miei Task') return pendingTaskCount
    if (item.label === 'Notifiche') return unreadNotifications
    return 0
  }

  // Group filtered items
  const grouped = new Map<NavGroup, NavItem[]>()
  for (const item of filteredNav) {
    const list = grouped.get(item.group) || []
    list.push(item)
    grouped.set(item.group, list)
  }

  return (
    <aside
      ref={sidebarRef}
      className="flex flex-col h-screen w-16 glass-sidebar text-sidebar-foreground border-r border-[var(--color-sidebar-border)] overflow-visible"
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-14">
        <Link href="/dashboard" className="flex items-center justify-center w-10 h-10">
          <Logo variant="auto" width={32} height={32} />
        </Link>
      </div>

      {/* Divider */}
      <div className="border-b border-[var(--color-sidebar-divider)] mx-3" />

      {/* Navigation */}
      <nav aria-label="Navigazione tablet" className="flex-1 overflow-y-auto py-3 px-1.5 scrollbar-none">
        {GROUP_ORDER.filter((g) => grouped.has(g)).map((group, groupIndex) => {
          const items = grouped.get(group)!
          return (
            <div key={group}>
              {groupIndex > 0 && (
                <div className="h-px bg-[var(--color-sidebar-divider)] mx-1.5 my-2.5" />
              )}
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                const badgeCount = getBadgeCount(item)
                const isFlyoutOpen = flyoutItem === item.label && item.children

                return (
                  <div key={item.label} className="relative mb-0.5">
                    {item.children ? (
                      <div
                        onMouseEnter={() => openFlyout(item.label)}
                        onMouseLeave={closeFlyout}
                      >
                        <Tooltip content={item.label} position="right">
                          <button
                            type="button"
                            onClick={() => setFlyoutItem(flyoutItem === item.label ? null : item.label)}
                            className={cn(
                              'w-full flex items-center justify-center p-2.5 rounded-lg transition-colors duration-150 relative',
                              isActive
                                ? 'bg-[var(--color-sidebar-active-bg)] text-sidebar-foreground font-semibold'
                                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-active" />
                            )}
                            <span className="relative flex-shrink-0">
                              <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-sidebar-active')} />
                              {badgeCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                              )}
                            </span>
                          </button>
                        </Tooltip>

                        {/* Flyout panel */}
                        <AnimatePresence>
                          {isFlyoutOpen && (
                            <motion.div
                              initial={FLYOUT_INITIAL}
                              animate={FLYOUT_ANIMATE}
                              exit={FLYOUT_EXIT}
                              transition={FLYOUT_TRANSITION}
                              onMouseEnter={cancelClose}
                              onMouseLeave={closeFlyout}
                              className="absolute left-full top-0 ml-1 z-50 min-w-[180px] py-1.5 rounded-lg glass-sidebar border border-[var(--color-sidebar-border)] shadow-[var(--shadow-lg)]"
                            >
                              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                                {item.label}
                              </div>
                              {item.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 mx-1 rounded-md',
                                    pathname === child.href
                                      ? 'text-sidebar-active bg-[var(--color-sidebar-active-bg)]'
                                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
                                  )}
                                >
                                  <span className={cn(
                                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                    pathname === child.href ? 'bg-sidebar-active' : 'bg-muted'
                                  )} />
                                  {child.label}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Tooltip content={item.label} position="right">
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center justify-center p-2.5 rounded-lg transition-colors duration-150 relative',
                            isActive
                              ? 'bg-[var(--color-sidebar-active-bg)] text-sidebar-foreground font-semibold'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-active" />
                          )}
                          <span className="relative flex-shrink-0">
                            <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-sidebar-active')} />
                            {badgeCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </span>
                        </Link>
                      </Tooltip>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
