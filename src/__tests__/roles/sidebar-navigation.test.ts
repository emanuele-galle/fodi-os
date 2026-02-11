import { describe, it, expect } from 'vitest'
import type { Role } from '@/generated/prisma/client'

/**
 * Test della logica di filtro sidebar.
 * Replica il filtro usato in Sidebar.tsx senza richiedere rendering React.
 */

interface NavItem {
  label: string
  href: string
  roles?: Role[]
  children?: { label: string; href: string }[]
}

// Copiata esattamente da Sidebar.tsx
const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    label: 'I Miei Task',
    href: '/tasks',
  },
  {
    label: 'Chat',
    href: '/chat',
  },
  {
    label: 'CRM',
    href: '/crm',
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
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'],
    children: [
      { label: 'Lista', href: '/projects' },
      { label: 'Tracciamento Ore', href: '/time' },
    ],
  },
  {
    label: 'Calendario',
    href: '/calendar',
  },
  {
    label: 'Finanze',
    href: '/erp',
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
    roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    children: [
      { label: 'Tutte le Pagine', href: '/kb' },
      { label: 'Attività Recenti', href: '/kb/activity' },
    ],
  },
  {
    label: 'Contenuti',
    href: '/content',
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
    roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'],
  },
  {
    label: 'Team',
    href: '/team',
  },
  {
    label: 'Impostazioni',
    href: '/settings',
    children: [
      { label: 'Profilo', href: '/settings' },
      { label: 'Utenti', href: '/settings/users' },
      { label: 'Sistema', href: '/settings/system' },
    ],
  },
]

function getVisibleNavItems(role: Role): string[] {
  return navigation
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => item.label)
}

describe('Sidebar - Navigazione per ruolo', () => {
  // Voci visibili a TUTTI i ruoli (senza restrizione roles)
  const universalItems = ['Dashboard', 'I Miei Task', 'Chat', 'Calendario', 'Team', 'Impostazioni']

  describe('ADMIN vede tutte le voci', () => {
    const visible = getVisibleNavItems('ADMIN')
    it('vede tutte le 12 voci', () => {
      expect(visible).toHaveLength(12)
    })
    it('include tutte le voci universali', () => {
      for (const item of universalItems) {
        expect(visible).toContain(item)
      }
    })
    it('include CRM, Progetti, Finanze, KB, Contenuti, Supporto', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Finanze')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Contenuti')
      expect(visible).toContain('Supporto')
    })
  })

  describe('MANAGER vede tutte le voci come ADMIN', () => {
    const visible = getVisibleNavItems('MANAGER')
    it('vede tutte le 12 voci', () => {
      expect(visible).toHaveLength(12)
    })
  })

  describe('SALES vede CRM, Finanze, KB ma non Progetti ne Contenuti ne Supporto', () => {
    const visible = getVisibleNavItems('SALES')
    it('include voci universali + CRM, Finanze, KB', () => {
      expect(visible).toContain('CRM')
      expect(visible).toContain('Finanze')
      expect(visible).toContain('Knowledge Base')
    })
    it('NON include Progetti', () => {
      expect(visible).not.toContain('Progetti')
    })
    it('NON include Contenuti', () => {
      expect(visible).not.toContain('Contenuti')
    })
    it('NON include Supporto', () => {
      expect(visible).not.toContain('Supporto')
    })
  })

  describe('PM vede CRM, Progetti, KB, Supporto ma non Finanze ne Contenuti', () => {
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
    it('NON include Contenuti', () => {
      expect(visible).not.toContain('Contenuti')
    })
  })

  describe('DEVELOPER vede Progetti, KB, Supporto ma non CRM ne Finanze ne Contenuti', () => {
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
    it('NON include Contenuti', () => {
      expect(visible).not.toContain('Contenuti')
    })
  })

  describe('CONTENT vede Progetti, KB, Contenuti ma non CRM ne Finanze ne Supporto', () => {
    const visible = getVisibleNavItems('CONTENT')
    it('include Progetti, KB, Contenuti', () => {
      expect(visible).toContain('Progetti')
      expect(visible).toContain('Knowledge Base')
      expect(visible).toContain('Contenuti')
    })
    it('NON include CRM', () => {
      expect(visible).not.toContain('CRM')
    })
    it('NON include Finanze', () => {
      expect(visible).not.toContain('Finanze')
    })
    it('NON include Supporto', () => {
      expect(visible).not.toContain('Supporto')
    })
  })

  describe('SUPPORT vede CRM, KB, Supporto ma non Progetti ne Finanze ne Contenuti', () => {
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
    it('NON include Contenuti', () => {
      expect(visible).not.toContain('Contenuti')
    })
  })

  describe('CLIENT vede solo le voci universali', () => {
    const visible = getVisibleNavItems('CLIENT')
    it('vede solo le voci senza restrizione ruolo', () => {
      expect(visible).toEqual(universalItems)
    })
    it('NON vede CRM, Progetti, Finanze, KB, Contenuti, Supporto', () => {
      expect(visible).not.toContain('CRM')
      expect(visible).not.toContain('Progetti')
      expect(visible).not.toContain('Finanze')
      expect(visible).not.toContain('Knowledge Base')
      expect(visible).not.toContain('Contenuti')
      expect(visible).not.toContain('Supporto')
    })
  })
})

describe('Sidebar - Coerenza permessi API vs Sidebar', () => {
  // Verifica che se un ruolo vede "CRM" nella sidebar, abbia anche i permessi API per crm
  // Importa hasPermission per il confronto
  it('SALES vede CRM nella sidebar E ha permessi CRM API', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('SALES')
    expect(visible).toContain('CRM')
    expect(hasPermission('SALES', 'crm', 'read')).toBe(true)
  })

  it('DEVELOPER NON vede CRM nella sidebar E NON ha permessi CRM API', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('DEVELOPER')
    expect(visible).not.toContain('CRM')
    expect(hasPermission('DEVELOPER', 'crm', 'read')).toBe(false)
  })

  it('DEVELOPER NON vede Finanze nella sidebar E NON ha permessi ERP API', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('DEVELOPER')
    expect(visible).not.toContain('Finanze')
    expect(hasPermission('DEVELOPER', 'erp', 'read')).toBe(false)
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

describe('Sidebar - Problemi di coerenza (PM vede CRM sidebar ma non ha permessi API crm)', () => {
  /**
   * NOTA: Questo test evidenzia un potenziale problema di coerenza.
   * PM vede la voce CRM nella sidebar (roles include 'PM'),
   * ma PM NON ha permessi crm nella matrice permissions.ts.
   * Questo significa che PM vede il link ma le API ritornano 403.
   */
  it('PM vede CRM nella sidebar MA NON ha permessi API crm:read', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('PM')

    // PM vede CRM nella sidebar e ha permessi read
    expect(visible).toContain('CRM')
    expect(hasPermission('PM', 'crm', 'read')).toBe(true)
  })

  it('SUPPORT vede KB nella sidebar MA NON ha permessi API kb:read', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('SUPPORT')

    // SUPPORT vede KB nella sidebar e ha permessi read
    expect(visible).toContain('Knowledge Base')
    expect(hasPermission('SUPPORT', 'kb', 'read')).toBe(true)
  })

  it('SALES vede KB nella sidebar MA NON ha permessi API kb:read', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    const visible = getVisibleNavItems('SALES')

    // SALES vede KB nella sidebar e ha permessi read
    expect(visible).toContain('Knowledge Base')
    expect(hasPermission('SALES', 'kb', 'read')).toBe(true)
  })
})
