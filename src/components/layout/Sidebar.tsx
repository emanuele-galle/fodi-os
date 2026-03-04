'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Bell,
  Building2,
  Users,
  FolderKanban,
  CalendarDays,
  Euro,
  LifeBuoy,
  UsersRound,
  BookOpen,
  Library,
  Settings,
  Bot,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Role } from '@/generated/prisma/client'
import { Tooltip } from '@/components/ui/Tooltip'
import { Logo } from '@/components/ui/Logo'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { getEffectiveSectionAccess, HREF_TO_SECTION, type SectionAccessMap } from '@/lib/section-access'

type NavGroup = 'main' | 'work' | 'admin' | 'team' | 'system'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: Role[]
  children?: { label: string; href: string }[]
  group: NavGroup
}

const GROUP_LABELS: Record<NavGroup, string | null> = {
  main: 'Principale',
  work: 'Lavoro',
  admin: 'Gestione',
  team: 'Team & Risorse',
  system: null,
}

const GROUP_ORDER: NavGroup[] = ['main', 'work', 'admin', 'team', 'system']

const navigation: NavItem[] = [
  // Principale
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'I Miei Task', href: '/tasks', icon: CheckSquare, group: 'main' },
  {
    label: 'Calendario',
    href: '/calendar',
    icon: CalendarDays,
    children: [
      { label: 'Eventi', href: '/calendar' },
      { label: 'Disponibilità', href: '/calendar/availability' },
    ],
    group: 'main',
  },
  { label: 'Chat', href: '/chat', icon: MessageCircle, group: 'main' },
  { label: 'Assistente AI', href: '/ai', icon: Bot, group: 'main' },
  { label: 'Notifiche', href: '/notifications', icon: Bell, group: 'main' },
  // Lavoro
  {
    label: 'Progetti Clienti',
    href: '/projects',
    icon: FolderKanban,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT'],
    children: [
      { label: 'Lista', href: '/projects' },
      { label: 'Analytics', href: '/projects/analytics' },
    ],
    group: 'work',
  },
  {
    label: 'Supporto',
    href: '/support',
    icon: LifeBuoy,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM', 'DEVELOPER', 'SUPPORT'],
    group: 'work',
  },
  // Gestione
  {
    label: 'Contabilita',
    href: '/erp',
    icon: Euro,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'COMMERCIALE'],
    children: [
      { label: 'Panoramica', href: '/erp/panoramica' },
      { label: 'Movimenti', href: '/erp/movimenti' },
      { label: 'Conti', href: '/erp/accounts' },
      { label: 'Preventivi', href: '/erp/quotes' },
      { label: 'Documenti', href: '/erp/documenti' },
      { label: 'Impostazioni', href: '/erp/settings' },
    ],
    group: 'admin',
  },
  {
    label: 'CRM',
    href: '/crm',
    icon: Users,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'SUPPORT'],
    children: [
      { label: 'Dashboard', href: '/crm/dashboard' },
      { label: 'Clienti', href: '/crm' },
      { label: 'Pipeline', href: '/crm/pipeline' },
      { label: 'Attività', href: '/crm/tasks' },
      { label: 'Leads', href: '/crm/leads' },
      { label: 'Gestione Tag', href: '/crm/settings/tags' },
    ],
    group: 'admin',
  },
  {
    label: 'Azienda',
    href: '/internal',
    icon: Building2,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    group: 'admin',
  },
  // Team & Risorse
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
    group: 'team',
  },
  {
    label: 'Knowledge Base',
    href: '/kb',
    icon: Library,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    group: 'team',
  },
  // System (no title)
  { label: 'Guida', href: '/guide', icon: BookOpen, group: 'system' },
  {
    label: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Profilo', href: '/settings' },
      { label: 'Fatturazione', href: '/settings/billing' },
      { label: 'Utenti', href: '/settings/users' },
      { label: 'Assistente AI', href: '/settings/ai' },
      { label: 'Sistema', href: '/settings/system' },
    ],
    group: 'system',
  },
]

interface SidebarProps {
  userRole: Role
  sectionAccess?: SectionAccessMap | null
  customRoleSectionAccess?: SectionAccessMap | null
  unreadChat?: number
  pendingTaskCount?: number
  unreadNotifications?: number
}

export function Sidebar({ userRole, sectionAccess, customRoleSectionAccess, unreadChat = 0, pendingTaskCount = 0, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { preferences, updatePreference, loaded } = useUserPreferences()
  const expanded = loaded ? !preferences.sidebarCollapsed : true
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const toggleSidebar = useCallback(() => {
    updatePreference('sidebarCollapsed', !preferences.sidebarCollapsed)
    if (!preferences.sidebarCollapsed) setExpandedItem(null)
  }, [preferences.sidebarCollapsed, updatePreference])

  const effective = getEffectiveSectionAccess(userRole, sectionAccess, customRoleSectionAccess)
  const filteredNav = navigation.filter((item) => {
    const section = HREF_TO_SECTION[item.href]
    if (section) return effective[section]?.view
    return !item.roles || item.roles.includes(userRole)
  })

  // eslint-disable-next-line sonarjs/cognitive-complexity -- UI render with many conditional branches for active/expanded/badge states
  const renderNavItem = useCallback((item: NavItem) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const isItemExpanded = expandedItem === item.label
    const Icon = item.icon

    const badgeCount = item.label === 'Chat' ? unreadChat
      : item.label === 'I Miei Task' ? pendingTaskCount
      : item.label === 'Notifiche' ? unreadNotifications
      : 0

    const submenuId = item.children ? `submenu-${item.label.toLowerCase().replace(/\s+/g, '-')}` : undefined

    const navContent = item.children ? (
      <button
        type="button"
        onClick={() => setExpandedItem(isItemExpanded ? null : item.label)}
        aria-expanded={isItemExpanded}
        aria-controls={submenuId}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 relative group',
          isActive
            ? 'bg-[var(--color-sidebar-active-bg)] text-sidebar-foreground font-semibold'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-active" />
        )}
        <span className="relative flex-shrink-0">
          <Icon
            className={cn(
              'h-[18px] w-[18px]',
              isActive && 'text-sidebar-active'
            )}
          />
          {!expanded && badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 truncate whitespace-nowrap overflow-hidden text-left"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {expanded && (
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-200 flex-shrink-0',
              isItemExpanded && 'rotate-90'
            )}
          />
        )}
      </button>
    ) : (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 relative group',
          isActive
            ? 'bg-[var(--color-sidebar-active-bg)] text-sidebar-foreground font-semibold'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-active" />
        )}
        <span className="relative flex-shrink-0">
          <Icon
            className={cn(
              'h-[18px] w-[18px]',
              isActive && 'text-sidebar-active'
            )}
          />
          {!expanded && badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 truncate whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {expanded && badgeCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-xs font-bold text-white flex-shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </Link>
    )

    return (
      <div key={item.label} className="mb-0.5">
        {!expanded ? (
          <Tooltip content={item.label} position="right">
            {navContent}
          </Tooltip>
        ) : navContent}

        <AnimatePresence>
          {expanded && item.children && isItemExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              id={submenuId}
              role="region"
            >
              <div className="ml-9 mt-1 space-y-0.5 pb-1 border-l border-[var(--color-sidebar-divider)] pl-0">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
                      pathname === child.href
                        ? 'text-sidebar-active bg-[var(--color-sidebar-active-bg)]'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-[var(--color-sidebar-hover)]'
                    )}
                  >
                    <span className={cn(
                      'w-1 h-1 rounded-full flex-shrink-0',
                      pathname === child.href ? 'bg-sidebar-active' : 'bg-muted'
                    )} />
                    {child.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }, [pathname, expandedItem, expanded, unreadChat, pendingTaskCount, unreadNotifications])

  /* eslint-disable react-perf/jsx-no-new-object-as-prop -- framer-motion animation objects */
  return (
    <motion.aside
      animate={{ width: expanded ? 260 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen glass-sidebar text-sidebar-foreground border-r border-[var(--color-sidebar-border)] overflow-hidden"
    >
      {/* Logo + Toggle */}
      <div className="flex items-center h-14 px-3 gap-2">
        {!expanded ? (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
            title="Apri sidebar"
          >
            <PanelLeft className="h-5 w-5 text-sidebar-foreground/60" />
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between flex-1 min-w-0"
          >
            <Link href="/dashboard" className="flex items-center">
              <Logo variant="auto" />
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-[var(--color-sidebar-hover)] transition-colors"
              title="Chiudi sidebar"
            >
              <PanelLeftClose className="h-4 w-4 text-sidebar-foreground/50" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Divider */}
      <div className="border-b border-[var(--color-sidebar-divider)] mx-3" />

      {/* Navigation */}
      <nav aria-label="Navigazione principale" className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
        {(() => {
          // Group filtered items by their group, preserving order
          const grouped = new Map<NavGroup, NavItem[]>()
          for (const item of filteredNav) {
            const list = grouped.get(item.group) || []
            list.push(item)
            grouped.set(item.group, list)
          }

          return GROUP_ORDER.filter((g) => grouped.has(g)).map((group, groupIndex) => {
            const items = grouped.get(group)!
            const groupLabel = GROUP_LABELS[group]

            return (
              <div key={group}>
                {/* Separator between groups */}
                {groupIndex > 0 && (
                  <div className="h-px bg-[var(--color-sidebar-divider)] mx-3 my-2.5" />
                )}
                {/* Group title (hidden when collapsed, null for system group) */}
                {expanded && groupLabel && (
                  <div className="text-xs uppercase tracking-wider text-sidebar-foreground/55 px-3 pt-3 pb-1 select-none">
                    {groupLabel}
                  </div>
                )}
                {items.map(renderNavItem)}
              </div>
            )
          })
        })()}
      </nav>
    </motion.aside>
  )
}
