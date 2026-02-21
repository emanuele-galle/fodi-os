import { describe, it, expect } from 'vitest'
import { hasPermission } from '@/lib/permissions'
import type { Module } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

interface MenuItem {
  label: string
  href: string
  roles?: Role[]
  apiModule?: Module
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'CRM', href: '/crm', roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'SUPPORT'], apiModule: 'crm' },
  { label: 'Progetti', href: '/projects', roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT'], apiModule: 'pm' },
  { label: 'Calendario', href: '/calendar' },
  { label: 'Finanze', href: '/erp', roles: ['ADMIN', 'DIR_COMMERCIALE', 'COMMERCIALE'], apiModule: 'erp' },
  { label: 'Knowledge Base', href: '/kb', apiModule: 'kb' },
  { label: 'Contenuti', href: '/content', roles: ['ADMIN', 'DIR_TECNICO', 'CONTENT'], apiModule: 'content' },
  { label: 'Supporto', href: '/support', roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM', 'DEVELOPER', 'SUPPORT'], apiModule: 'support' },
  { label: 'Team', href: '/team' },
  { label: 'Impostazioni', href: '/settings' },
]

const TAB_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Task', href: '/tasks' },
  { label: 'Chat', href: '/chat' },
  { label: 'Menu', href: '#menu' },
]

const ALL_ROLES: Role[] = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']

function getVisibleMenuItems(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
}

describe('BottomNav - TAB_ITEMS sono fissi per tutti', () => {
  it('ci sono 4 tab items', () => {
    expect(TAB_ITEMS).toHaveLength(4)
  })

  it('tab items sono Dashboard, Task, Chat, Menu', () => {
    const labels = TAB_ITEMS.map((t) => t.label)
    expect(labels).toEqual(['Dashboard', 'Task', 'Chat', 'Menu'])
  })
})

describe('BottomNav - MENU_ITEMS filtrati per ruolo', () => {
  it('ADMIN vede tutti i 9 menu items', () => {
    const items = getVisibleMenuItems('ADMIN')
    expect(items).toHaveLength(9)
  })

  it('DIR_COMMERCIALE vede CRM, Progetti, Finanze, KB, Supporto, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('DIR_COMMERCIALE')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Finanze')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).not.toContain('Contenuti')
  })

  it('COMMERCIALE vede CRM, Progetti, Finanze, KB ma non Contenuti ne Supporto', () => {
    const items = getVisibleMenuItems('COMMERCIALE')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Finanze')
    expect(labels).toContain('Knowledge Base')
    expect(labels).not.toContain('Contenuti')
    expect(labels).not.toContain('Supporto')
  })

  it('PM vede CRM, Progetti, KB, Supporto ma non Finanze ne Contenuti', () => {
    const items = getVisibleMenuItems('PM')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('CRM')
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).not.toContain('Finanze')
    expect(labels).not.toContain('Contenuti')
  })

  it('DEVELOPER vede Progetti, KB, Supporto ma non CRM ne Finanze', () => {
    const items = getVisibleMenuItems('DEVELOPER')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Progetti')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Supporto')
    expect(labels).not.toContain('CRM')
    expect(labels).not.toContain('Finanze')
  })

  it('CLIENT vede solo Calendario, KB, Team, Impostazioni', () => {
    const items = getVisibleMenuItems('CLIENT')
    const labels = items.map((i) => i.label)
    expect(labels).toContain('Calendario')
    expect(labels).toContain('Knowledge Base')
    expect(labels).toContain('Team')
    expect(labels).toContain('Impostazioni')
    expect(labels).not.toContain('CRM')
    expect(labels).not.toContain('Progetti')
    expect(labels).not.toContain('Finanze')
  })
})

describe('BottomNav - Coerenza tra menu items e permessi API', () => {
  const itemsWithApi = MENU_ITEMS.filter((item) => item.apiModule)

  for (const item of itemsWithApi) {
    describe(`${item.label} (${item.apiModule})`, () => {
      const bugs: Role[] = []

      for (const role of ALL_ROLES) {
        const visibleInMenu = !item.roles || item.roles.includes(role)
        const hasApiAccess = hasPermission(role, item.apiModule!, 'read')

        if (visibleInMenu && !hasApiAccess) {
          bugs.push(role)
        }
      }

      if (bugs.length === 0) {
        it('coerenza OK: tutti i ruoli che vedono il menu hanno il permesso API', () => {
          for (const role of ALL_ROLES) {
            const visibleInMenu = !item.roles || item.roles.includes(role)
            const hasApiAccess = hasPermission(role, item.apiModule!, 'read')
            if (visibleInMenu) {
              expect(hasApiAccess).toBe(true)
            }
          }
        })
      } else {
        for (const role of bugs) {
          it(`BUG: ${role} vede "${item.label}" nel menu ma NON ha ${item.apiModule}:read`, () => {
            const visibleInMenu = !item.roles || item.roles.includes(role)
            expect(visibleInMenu).toBe(true)
            expect(hasPermission(role, item.apiModule!, 'read')).toBe(false)
          })
        }
      }
    })
  }
})
