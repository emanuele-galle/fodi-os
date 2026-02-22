import { describe, it, expect } from 'vitest'
import type { Role } from '@/generated/prisma/client'

interface NavItem {
  label: string
  href: string
  roles?: Role[]
  children?: { label: string; href: string }[]
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'I Miei Task', href: '/tasks' },
  { label: 'Chat', href: '/chat' },
  {
    label: 'CRM',
    href: '/crm',
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'SUPPORT'],
  },
  {
    label: 'Progetti',
    href: '/projects',
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT'],
  },
  { label: 'Calendario', href: '/calendar' },
  {
    label: 'Finanze',
    href: '/erp',
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'COMMERCIALE'],
  },
  {
    label: 'Knowledge Base',
    href: '/kb',
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
  },
  {
    label: 'Supporto',
    href: '/support',
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM', 'DEVELOPER', 'SUPPORT'],
  },
  { label: 'Team', href: '/team' },
  { label: 'Impostazioni', href: '/settings' },
]

function getVisibleNavItems(role: Role): string[] {
  return navigation
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => item.label)
}

describe('Sidebar - Navigazione per ruolo', () => {
  const universalItems = ['Dashboard', 'I Miei Task', 'Chat', 'Calendario', 'Team', 'Impostazioni']

  describe('ADMIN vede tutte le voci', () => {
    const visible = getVisibleNavItems('ADMIN')
    it('vede tutte le 11 voci', () => {
      expect(visible).toHaveLength(11)
    })
    it('include tutte le voci universali', () => {
      for (const item of universalItems) {
        expect(visible).toContain(item)
      }
    })
  })

  describe('DIR_COMMERCIALE vede CRM, Progetti, Finanze, KB, Supporto', () => {
    const visible = getVisibleNavItems('DIR_COMMERCIALE')
    it('include CRM, Progetti, Finanze, KB, Supporto', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Finanze')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Supporto')
    })
  })

  describe('DIR_TECNICO vede CRM, Progetti, KB, Supporto ma non Finanze', () => {
    const visible = getVisibleNavItems('DIR_TECNICO')
    it('include CRM, Progetti, KB, Supporto', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Supporto')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
  })

  describe('COMMERCIALE vede CRM, Progetti, Finanze, KB, Supporto', () => {
    const visible = getVisibleNavItems('COMMERCIALE')
    it('include CRM, Finanze, KB', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Finanze')
      expect(visible).toContain('Knowledge Base')
    })
  })

  describe('PM vede CRM, Progetti, KB, Supporto ma non Finanze', () => {
    const visible = getVisibleNavItems('PM')
    it('include CRM, Progetti, KB, Supporto', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Supporto')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
  })

  describe('DEVELOPER vede Progetti, KB, Supporto ma non CRM ne Finanze', () => {
    const visible = getVisibleNavItems('DEVELOPER')
    it('include Progetti, KB, Supporto', () => {
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Supporto')
    })
    it('NON include CRM', () => {
      expect(visible).not.toContain('CRM')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
  })

  describe('CONTENT vede Progetti, KB ma non CRM ne Finanze ne Supporto', () => {
    const visible = getVisibleNavItems('CONTENT')
    it('include Progetti, KB', () => {
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Knowledge Base')
    })
    it('NON include CRM', () => {
      expect(visible).not.toContain('CRM')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
  })

  describe('SUPPORT vede CRM, KB, Supporto ma non Progetti ne Finanze', () => {
    const visible = getVisibleNavItems('SUPPORT')
    it('include CRM, KB, Supporto', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Supporto')
    })
    it('NON include Progetti', () => {
      expect(visible).not.toContain('Progetti')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
  })

  describe('CLIENT vede solo le voci universali', () => {
    const visible = getVisibleNavItems('CLIENT')
    it('vede solo le voci senza restrizione ruolo', () => {
      expect(visible).toEqual(universalItems)
    })
  })
})

describe('Sidebar - Coerenza permessi API vs Sidebar', () => {
  it('COMMERCIALE vede CRM nella sidebar E ha permessi CRM API', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('COMMERCIALE')
    expect(visible).toContain('CRM')
    expect(hasPermission('COMMERCIALE', 'crm', 'read')).toBe(true)
  })

  it('DEVELOPER NON vede CRM nella sidebar E NON ha permessi CRM API', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('DEVELOPER')
    expect(visible).not.toContain('CRM')
    expect(hasPermission('DEVELOPER', 'crm', 'read')).toBe(false)
  })

  it('CLIENT NON vede nulla di speciale E NON ha permessi su moduli interni', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('CLIENT')
    expect(visible).not.toContain('CRM')
    expect(visible).not.toContain('Finanze')
    expect(hasPermission('CLIENT', 'crm', 'read')).toBe(false)
    expect(hasPermission('CLIENT', 'erp', 'read')).toBe(false)
    expect(hasPermission('CLIENT', 'pm', 'read')).toBe(false)
  })
})
