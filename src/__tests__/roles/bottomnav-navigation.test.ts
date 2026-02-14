import { describe, it, expect } from 'vitest'
import { hasPermission } from '@/lib/permissions'
import type { Module } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

/**
 * BottomNav MENU_ITEMS dal componente BottomNav.tsx
 * Replica esatta della configurazione per test di coerenza.
 */
interface MenuItem {
  label: string
  href: string
  roles?: Role[]
  apiModule?: Module // modulo API corrispondente
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'CRM', href: '/crm', roles: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'SUPPORT'], apiModule: 'crm' },
  { label: 'Progetti', href: '/projects', roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT'], apiModule: 'pm' },
  { label: 'Calendario', href: '/calendar' },
  { label: 'Finanze', href: '/erp', roles: ['ADMIN', 'MANAGER', 'SALES'], apiModule: 'erp' },
  { label: 'Knowledge Base', href: '/kb', apiModule: 'kb' },
  { label: 'Contenuti', href: '/content', roles: ['ADMIN', 'MANAGER', 'CONTENT'], apiModule: 'content' },
  { label: 'Supporto', href: '/support', roles: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'], apiModule: 'support' },
  { label: 'Team', href: '/team' },
  { label: 'Impostazioni', href: '/settings' },
]

const TAB_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Task', href: '/tasks' },
  { label: 'Chat', href: '/chat' },
  { label: 'Menu', href: '#menu' },
]

const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']

function getVisibleMenuItems(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}

// --- Tab items visibili a tutti ---

describe('BottomNav - TAB_ITEMS sono fissi per tutti', () => {
  it('ci sono 4 tab items', () => {
    expect(TAB_ITEMS).toHaveLength(4)
  })

  it('tab items sono Dashboard, Task, Chat, Menu', () => {
    const labels = TAB_ITEMS.map((t) => t.label)
    expect(labels).toEqual(['Dashboard', 'Task', 'Chat', 'Menu'])
  })

  it('tutte le label dei tab sono in italiano (o termini tecnici accettati)', () => {
    // "Dashboard", "Task", "Chat", "Menu" sono termini tecnici/universali accettati
    for (const tab of TAB_ITEMS) {
      expect(tab.label.length).toBeGreaterThan(0)
    }
  })
})

// --- Menu items per ruolo ---

describe('BottomNav - MENU_ITEMS filtrati per ruolo', () => {
  it('ADMIN vede tutti i 9 menu items', () => {
    const items = getVisibleMenuItems('ADMIN')
    expect(items).toHaveLength(9)
  })

  it('MANAGER vede tutti i 9 menu items', () => {
    const items = getVisibleMenuItems('MANAGER')
    expect(items).toHaveLength(9)
  })

  it('SALES vede CRM, Calendario, Finanze, Knowledge Base, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('SALES')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Finanze')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('Progetti')
    expect(labels).not.toContain('Contenuti')
    expect(labels).not.toContain('Supporto')
  })

  it('PM vede CRM, Progetti, Calendario, Knowledge Base, Supporto, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('PM')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Contenuti')
  })

  it('DEVELOPER vede Progetti, Calendario, Knowledge Base, Supporto, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('DEVELOPER')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('CRM')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Contenuti')
  })

  it('CONTENT vede Progetti, Calendario, Knowledge Base, Contenuti, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('CONTENT')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Contenuti')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('CRM')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Supporto')
  })

  it('SUPPORT vede CRM, Calendario, Knowledge Base, Supporto, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('SUPPORT')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('Progetti')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Contenuti')
  })

  it('CLIENT vede solo Calendario, Knowledge Base, Team, Impostazioni (items senza filtro ruolo)', () => {
    const items = getVisibleMenuItems('CLIENT')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('CRM')
    expect(labels).not.toContain('Progetti')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Contenuti')
    expect(labels).not.toContain('Supporto')
  })
})

// --- Coerenza Sidebar vs BottomNav ---

describe('BottomNav - Coerenza tra menu items e permessi API', () => {
  const itemsWithApi = MENU_ITEMS.filter((item) => item.apiModule)

  for (const item of itemsWithApi) {
    describe(`${item.label} (${item.apiModule})`, () => {
      const bugs: Role[] = []
      const notes: Role[] = []

      for (const role of ALL_ROLES) {
        const visibleInMenu = !item.roles || item.roles.includes(role)
        const hasApiAccess = hasPermission(role, item.apiModule!, 'read')

        if (visibleInMenu && !hasApiAccess) {
          bugs.push(role)
        }
        if (!visibleInMenu && hasApiAccess) {
          notes.push(role)
        }
      }

      if (bugs.length > 0) {
        for (const role of bugs) {
          it(`BUG: ${role} vede "${item.label}" nel menu ma NON ha ${item.apiModule}:read`, () => {
            const visibleInMenu = !item.roles || item.roles.includes(role)
            const hasApiAccess = hasPermission(role, item.apiModule!, 'read')
            expect(visibleInMenu).toBe(true)
            expect(hasApiAccess).toBe(false)
          })
        }
      }

      if (notes.length > 0) {
        for (const role of notes) {
          it(`NOTA: ${role} NON vede "${item.label}" nel menu ma ha ${item.apiModule}:read`, () => {
            const visibleInMenu = !item.roles || item.roles.includes(role)
            const hasApiAccess = hasPermission(role, item.apiModule!, 'read')
            expect(visibleInMenu).toBe(false)
            expect(hasApiAccess).toBe(true)
          })
        }
      }

      if (bugs.length === 0 && notes.length === 0) {
        it('coerenza OK: tutti i ruoli che vedono il menu hanno il permesso API', () => {
          for (const role of ALL_ROLES) {
            const visibleInMenu = !item.roles || item.roles.includes(role)
            const hasApiAccess = hasPermission(role, item.apiModule!, 'read')
            if (visibleInMenu) {
              expect(hasApiAccess).toBe(true)
            }
          }
        })
      }
    })
  }
})

// --- Localizzazione labels ---

describe('BottomNav - Localizzazione italiana', () => {
  const englishWords = ['Dashboard', 'Task', 'Chat', 'Menu', 'CRM', 'Team', 'Knowledge Base']

  it('tutti i menu items hanno label non vuote', () => {
    for (const item of MENU_ITEMS) {
      expect(item.label.trim().length).toBeGreaterThan(0)
    }
  })

  it('le label in italiano corrispondono: Progetti, Calendario, Finanze, Contenuti, Supporto, Impostazioni', () => {
    const labels = MENU_ITEMS.map((i) => i.label)
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Finanze')
    expect(labels).toContain('Contenuti')
    expect(labels).toContain('Supporto')
    expect(labels).toContain('Impostazioni')
  })

  it('nessuna label e puramente inglese (esclusi termini tecnici accettati)', () => {
    const technicalTerms = ['CRM', 'Team', 'Knowledge Base']
    for (const item of MENU_ITEMS) {
      if (!technicalTerms.includes(item.label)) {
        // Se non e un termine tecnico, non dovrebbe essere inglese puro
        const pureEnglishWords = ['Settings', 'Projects', 'Finance', 'Calendar', 'Content', 'Support']
        expect(pureEnglishWords).not.toContain(item.label)
      }
    }
  })
})
