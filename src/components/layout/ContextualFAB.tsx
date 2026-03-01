'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus, UserPlus, FolderPlus, ClipboardPlus, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'

interface FABConfig {
  label: string
  icon: typeof Plus
  href?: string
  action?: string
  color: string
  bgColor: string
}

const FAB_MAP: Record<string, FABConfig> = {
  '/crm': {
    label: 'Nuovo Cliente',
    icon: UserPlus,
    href: '/crm',
    action: 'new-client',
    color: 'text-white',
    bgColor: 'bg-primary',
  },
  '/projects': {
    label: 'Nuovo Progetto',
    icon: FolderPlus,
    href: '/projects',
    action: 'new-project',
    color: 'text-white',
    bgColor: 'bg-accent',
  },
  '/tasks': {
    label: 'Nuovo Task',
    icon: ClipboardPlus,
    href: '/tasks',
    action: 'new-task',
    color: 'text-white',
    bgColor: 'bg-primary',
  },
  '/erp': {
    label: 'Nuovo Movimento',
    icon: Receipt,
    href: '/erp/movements/new',
    color: 'text-white',
    bgColor: 'bg-amber-500',
  },
}

function getFABForPath(pathname: string): FABConfig | null {
  for (const [path, config] of Object.entries(FAB_MAP)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return config
    }
  }
  return null
}

export function ContextualFAB() {
  const pathname = usePathname()
  const router = useRouter()
  const config = getFABForPath(pathname)

  if (!config) return null

  const Icon = config.icon

  function handleClick() {
    haptic('light')
    if (config!.href) {
      // If action is specified, navigate with query param to trigger modal
      const url = config!.action ? `${config!.href}?action=${config!.action}` : config!.href
      router.push(url)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'fixed z-40 md:hidden',
        'bottom-20 right-4',
        'w-14 h-14 rounded-full shadow-lg',
        'flex items-center justify-center',
        'active:scale-90 transition-all duration-200',
        config.bgColor,
        config.color
      )}
      aria-label={config.label}
      title={config.label}
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}
