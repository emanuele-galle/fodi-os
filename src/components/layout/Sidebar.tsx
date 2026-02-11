'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Users,
  FolderKanban,
  CalendarDays,
  Receipt,
  BookOpen,
  Film,
  LifeBuoy,
  UsersRound,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import type { Role } from '@/generated/prisma/client'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: Role[]
  children?: { label: string; href: string }[]
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'I Miei Task',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Chat',
    href: '/chat',
    icon: MessageCircle,
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
    label: 'Progetti',
    href: '/projects',
    icon: FolderKanban,
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'],
    children: [
      { label: 'Lista', href: '/projects' },
      { label: 'Time Tracking', href: '/time' },
    ],
  },
  {
    label: 'Calendario',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    label: 'Finanze',
    href: '/erp',
    icon: Receipt,
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
      { label: 'Attivita Recenti', href: '/kb/activity' },
    ],
  },
  {
    label: 'Contenuti',
    href: '/content',
    icon: Film,
    roles: ['ADMIN', 'MANAGER', 'CONTENT'],
    children: [
      { label: 'Asset Library', href: '/content/assets' },
      { label: 'Review', href: '/content/reviews' },
      { label: 'Social', href: '/content/social' },
    ],
  },
  {
    label: 'Supporto',
    href: '/support',
    icon: LifeBuoy,
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'],
  },
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
  },
  {
    label: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Profilo', href: '/settings' },
      { label: 'Utenti', href: '/settings/users' },
      { label: 'Sistema', href: '/settings/system' },
    ],
  },
]

interface SidebarProps {
  userRole: Role
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const filteredNav = navigation.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar text-sidebar-foreground border-r border-border/10 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo-fodi.png"
              alt="FODI"
              width={120}
              height={42}
              priority
            />
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-[#C4A052] text-[#1E293B] font-bold text-sm"
          >
            F
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Divider */}
      <div className="border-b border-white/5 mx-2" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {filteredNav.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isExpanded = expandedItem === item.label
          const Icon = item.icon

          return (
            <div key={item.label} className="mb-1">
              <Link
                href={item.children ? '#' : item.href}
                onClick={(e) => {
                  if (item.children) {
                    e.preventDefault()
                    setExpandedItem(isExpanded ? null : item.label)
                  }
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 relative',
                  isActive
                    ? 'bg-sidebar-active/15 text-[#D4B566] border-l-3 border-sidebar-active'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5 border-l-3 border-transparent'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.children && (
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    )}
                  </>
                )}
              </Link>

              {/* Sub-items */}
              {!collapsed && item.children && isExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block px-3 py-1.5 rounded-md text-sm transition-colors duration-200',
                        pathname === child.href
                          ? 'text-[#D4B566] bg-white/10'
                          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
