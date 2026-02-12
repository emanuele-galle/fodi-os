'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Building2,
  Users,
  FolderKanban,
  CalendarDays,
  Euro,
  BookOpen,
  Film,
  LifeBuoy,
  UsersRound,
  Settings,
  ChevronRight,
  Pin,
  PinOff,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Role } from '@/generated/prisma/client'
import { Tooltip } from '@/components/ui/Tooltip'
import { Logo } from '@/components/ui/Logo'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { getEffectiveSectionAccess, HREF_TO_SECTION, type SectionAccessMap } from '@/lib/section-access'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: Role[]
  children?: { label: string; href: string }[]
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'I Miei Task', href: '/tasks', icon: CheckSquare },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  {
    label: 'Azienda',
    href: '/internal',
    icon: Building2,
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SALES', 'CONTENT', 'SUPPORT'],
  },
  {
    label: 'CRM',
    href: '/crm',
    icon: Users,
    roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'],
    children: [
      { label: 'Clienti', href: '/crm' },
      { label: 'Pipeline', href: '/crm/pipeline' },
      { label: 'Leads', href: '/crm/leads' },
    ],
  },
  {
    label: 'Progetti Clienti',
    href: '/projects',
    icon: FolderKanban,
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'],
    children: [
      { label: 'Lista', href: '/projects' },
      { label: 'Tracciamento Ore', href: '/time' },
    ],
  },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays },
  {
    label: 'Contabilità',
    href: '/erp',
    icon: Euro,
    roles: ['ADMIN', 'MANAGER', 'SALES'],
    children: [
      { label: 'Preventivi', href: '/erp/quotes' },
      { label: 'Fatture', href: '/erp/invoices' },
      { label: 'Spese', href: '/erp/expenses' },
      { label: 'Report', href: '/erp/reports' },
    ],
  },
  {
    label: 'Knowledge Base',
    href: '/kb',
    icon: BookOpen,
    roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    children: [
      { label: 'Tutte le Pagine', href: '/kb' },
      { label: 'Attività Recenti', href: '/kb/activity' },
    ],
  },
  {
    label: 'Contenuti',
    href: '/content',
    icon: Film,
    roles: ['ADMIN', 'MANAGER', 'CONTENT'],
    children: [
      { label: 'Libreria Asset', href: '/content/assets' },
      { label: 'Revisioni', href: '/content/reviews' },
      { label: 'Social', href: '/content/social' },
    ],
  },
  {
    label: 'Supporto',
    href: '/support',
    icon: LifeBuoy,
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'],
  },
  { label: 'Team', href: '/team', icon: UsersRound },
  {
    label: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Profilo', href: '/settings' },
      { label: 'Fatturazione', href: '/settings/billing' },
      { label: 'Utenti', href: '/settings/users' },
      { label: 'Sistema', href: '/settings/system' },
    ],
  },
]

// Group separator indices: after Chat (group 1), after Calendario (group 2), after Contenuti (group 3)
// Group 1: Dashboard, I Miei Task, Chat
// Group 2: Azienda, CRM, Progetti Clienti, Calendario
// Group 3: Contabilita, Knowledge Base, Contenuti
// Group 4: Supporto, Team, Impostazioni
const GROUP_SEPARATOR_LABELS = new Set(['Chat', 'Calendario', 'Contenuti'])

interface SidebarProps {
  userRole: Role
  sectionAccess?: SectionAccessMap | null
}

export function Sidebar({ userRole, sectionAccess }: SidebarProps) {
  const pathname = usePathname()
  const { preferences, updatePreference, loaded } = useUserPreferences()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Sync pinned state from preferences (inverted: sidebarCollapsed=true means NOT pinned)
  useEffect(() => {
    if (loaded) setPinned(!preferences.sidebarCollapsed)
  }, [loaded, preferences.sidebarCollapsed])

  const togglePin = useCallback(() => {
    const next = !pinned
    setPinned(next)
    updatePreference('sidebarCollapsed', !next)
  }, [pinned, updatePreference])

  const expanded = pinned || hovered

  const effective = getEffectiveSectionAccess(userRole, sectionAccess)
  const filteredNav = navigation.filter((item) => {
    const section = HREF_TO_SECTION[item.href]
    if (section) return effective[section]?.view
    return !item.roles || item.roles.includes(userRole)
  })

  return (
    <motion.aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!pinned) setExpandedItem(null) }}
      animate={{ width: expanded ? 256 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen bg-sidebar/95 backdrop-blur-xl text-sidebar-foreground border-r border-border/10 overflow-hidden shadow-[var(--shadow-lg)]"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-3 gap-2">
        {!expanded && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-10 h-10 flex-shrink-0"
          >
            <img src="/logo-official.png" alt="FODI" width={28} height={28} />
          </Link>
        )}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between flex-1 min-w-0"
            >
              <Link href="/dashboard" className="flex items-center">
                <Logo variant="light" />
              </Link>
              <Tooltip content={pinned ? 'Sblocca sidebar' : 'Blocca sidebar aperta'} position="right">
                <button
                  onClick={togglePin}
                  className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                >
                  {pinned ? (
                    <PinOff className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                  ) : (
                    <Pin className="h-3.5 w-3.5 text-sidebar-foreground/40" />
                  )}
                </button>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="border-b border-white/5 mx-3" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-none">
        {filteredNav.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isExpanded = expandedItem === item.label
          const Icon = item.icon

          // Check if previous item (in filtered list) should have a separator after it
          const prevItem = index > 0 ? filteredNav[index - 1] : null
          const showSeparator = prevItem && GROUP_SEPARATOR_LABELS.has(prevItem.label)

          const navContent = (
            <Link
              href={item.children ? '#' : item.href}
              onClick={(e) => {
                if (item.children) {
                  e.preventDefault()
                  setExpandedItem(isExpanded ? null : item.label)
                }
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 relative group',
                isActive
                  ? 'bg-primary/15 text-white font-semibold border-l-[3px] border-sidebar-active'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/12 hover:pl-4'
              )}
            >
              <Icon
                className={cn(
                  'flex-shrink-0 transition-all duration-200',
                  isActive
                    ? 'h-[22px] w-[22px] drop-shadow-[0_0_6px_var(--sidebar-active)]'
                    : 'h-5 w-5'
                )}
              />
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
              {expanded && item.children && (
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform duration-200 flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                />
              )}
              {/* Active indicator bar when collapsed */}
              {!expanded && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-active shadow-[0_0_8px_var(--sidebar-active)]" />
              )}
            </Link>
          )

          return (
            <div key={item.label}>
              {/* Group separator */}
              {showSeparator && (
                <div className="h-px bg-white/8 mx-3 my-2" />
              )}
              <div className="mb-0.5">
                {!expanded ? (
                  <Tooltip content={item.label} position="right">
                    {navContent}
                  </Tooltip>
                ) : navContent}

                {/* Sub-items */}
                <AnimatePresence>
                  {expanded && item.children && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-8 mt-1 space-y-0.5 pb-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-200',
                              pathname === child.href
                                ? 'text-sidebar-active bg-sidebar-active/10'
                                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-white/5'
                            )}
                          >
                            <span className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              pathname === child.href ? 'bg-sidebar-active' : 'bg-sidebar-foreground/25'
                            )} />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </nav>
    </motion.aside>
  )
}
