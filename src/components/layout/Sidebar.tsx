'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  BookOpen,
  Film,
  LifeBuoy,
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
    label: 'CRM',
    href: '/crm',
    icon: Users,
    roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'],
    children: [
      { label: 'Clienti', href: '/crm' },
      { label: 'Pipeline', href: '/crm/pipeline' },
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
    label: 'Impostazioni',
    href: '/settings',
    icon: Settings,
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
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            FODI<span className="text-sidebar-active">OS</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

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
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.children && (
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform',
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
                        'block px-3 py-1.5 rounded-md text-sm transition-colors',
                        pathname === child.href
                          ? 'text-white bg-white/10'
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
