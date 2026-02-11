import { describe, it, expect } from 'vitest'
import { hasPermission, requirePermission } from '@/lib/permissions'
import type { Module, Permission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

const ALL_ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']
const ALL_MODULES: Module[] = ['crm', 'erp', 'pm', 'kb', 'content', 'support', 'admin', 'portal', 'chat']

describe('Permissions - hasPermission', () => {
  describe('ADMIN ha accesso completo a tutti i moduli', () => {
    const allPerms: Permission[] = ['read', 'write', 'delete', 'approve', 'admin']
    for (const mod of ALL_MODULES) {
      it(`ADMIN ha tutti i permessi su ${mod}`, () => {
        for (const perm of allPerms) {
          // chat non ha delete/approve
          if (mod === 'chat' && (perm === 'delete' || perm === 'approve')) continue
          expect(hasPermission('ADMIN', mod, perm)).toBe(true)
        }
      })
    }
  })

  describe('MANAGER ha accesso ampio ma non admin completo', () => {
    it('MANAGER ha read/write/delete/approve su crm', () => {
      expect(hasPermission('MANAGER', 'crm', 'read')).toBe(true)
      expect(hasPermission('MANAGER', 'crm', 'write')).toBe(true)
      expect(hasPermission('MANAGER', 'crm', 'delete')).toBe(true)
      expect(hasPermission('MANAGER', 'crm', 'approve')).toBe(true)
    })

    it('MANAGER ha read/write/delete/approve su erp', () => {
      expect(hasPermission('MANAGER', 'erp', 'read')).toBe(true)
      expect(hasPermission('MANAGER', 'erp', 'write')).toBe(true)
    })

    it('MANAGER ha solo read su admin', () => {
      expect(hasPermission('MANAGER', 'admin', 'read')).toBe(true)
      expect(hasPermission('MANAGER', 'admin', 'write')).toBe(false)
    })

    it('MANAGER NON ha accesso a portal', () => {
      expect(hasPermission('MANAGER', 'portal', 'read')).toBe(false)
    })
  })

  describe('SALES ha accesso solo a CRM, ERP, PM(read), Chat', () => {
    it('SALES ha read/write su crm', () => {
      expect(hasPermission('SALES', 'crm', 'read')).toBe(true)
      expect(hasPermission('SALES', 'crm', 'write')).toBe(true)
    })

    it('SALES ha read/write su erp', () => {
      expect(hasPermission('SALES', 'erp', 'read')).toBe(true)
      expect(hasPermission('SALES', 'erp', 'write')).toBe(true)
    })

    it('SALES ha solo read su pm', () => {
      expect(hasPermission('SALES', 'pm', 'read')).toBe(true)
      expect(hasPermission('SALES', 'pm', 'write')).toBe(false)
    })

    it('SALES ha read su kb', () => {
      expect(hasPermission('SALES', 'kb', 'read')).toBe(true)
      expect(hasPermission('SALES', 'kb', 'write')).toBe(false)
    })

    it('SALES NON ha accesso a content, support, admin, portal', () => {
      expect(hasPermission('SALES', 'content', 'read')).toBe(false)
      expect(hasPermission('SALES', 'support', 'read')).toBe(false)
      expect(hasPermission('SALES', 'admin', 'read')).toBe(false)
      expect(hasPermission('SALES', 'portal', 'read')).toBe(false)
    })
  })

  describe('PM ha accesso a pm, kb, chat', () => {
    it('PM ha read/write/approve su pm', () => {
      expect(hasPermission('PM', 'pm', 'read')).toBe(true)
      expect(hasPermission('PM', 'pm', 'write')).toBe(true)
      expect(hasPermission('PM', 'pm', 'approve')).toBe(true)
    })

    it('PM ha read/write su kb', () => {
      expect(hasPermission('PM', 'kb', 'read')).toBe(true)
      expect(hasPermission('PM', 'kb', 'write')).toBe(true)
    })

    it('PM ha read su crm', () => {
      expect(hasPermission('PM', 'crm', 'read')).toBe(true)
      expect(hasPermission('PM', 'crm', 'write')).toBe(false)
    })

    it('PM ha read su support', () => {
      expect(hasPermission('PM', 'support', 'read')).toBe(true)
      expect(hasPermission('PM', 'support', 'write')).toBe(false)
    })

    it('PM NON ha accesso a erp, content, admin, portal', () => {
      expect(hasPermission('PM', 'erp', 'read')).toBe(false)
      expect(hasPermission('PM', 'content', 'read')).toBe(false)
      expect(hasPermission('PM', 'admin', 'read')).toBe(false)
    })
  })

  describe('DEVELOPER ha accesso a pm, kb, chat', () => {
    it('DEVELOPER ha read/write su pm', () => {
      expect(hasPermission('DEVELOPER', 'pm', 'read')).toBe(true)
      expect(hasPermission('DEVELOPER', 'pm', 'write')).toBe(true)
    })

    it('DEVELOPER NON ha approve/delete su pm', () => {
      expect(hasPermission('DEVELOPER', 'pm', 'approve')).toBe(false)
      expect(hasPermission('DEVELOPER', 'pm', 'delete')).toBe(false)
    })

    it('DEVELOPER ha read su support', () => {
      expect(hasPermission('DEVELOPER', 'support', 'read')).toBe(true)
      expect(hasPermission('DEVELOPER', 'support', 'write')).toBe(false)
    })

    it('DEVELOPER NON ha accesso a crm, erp', () => {
      expect(hasPermission('DEVELOPER', 'crm', 'read')).toBe(false)
      expect(hasPermission('DEVELOPER', 'erp', 'read')).toBe(false)
    })
  })

  describe('CONTENT ha accesso a content, kb, chat', () => {
    it('CONTENT ha read/write su content', () => {
      expect(hasPermission('CONTENT', 'content', 'read')).toBe(true)
      expect(hasPermission('CONTENT', 'content', 'write')).toBe(true)
    })

    it('CONTENT ha read su pm', () => {
      expect(hasPermission('CONTENT', 'pm', 'read')).toBe(true)
      expect(hasPermission('CONTENT', 'pm', 'write')).toBe(false)
    })

    it('CONTENT NON ha accesso a crm, erp', () => {
      expect(hasPermission('CONTENT', 'crm', 'read')).toBe(false)
      expect(hasPermission('CONTENT', 'erp', 'read')).toBe(false)
    })
  })

  describe('SUPPORT ha accesso a support, crm(read), chat', () => {
    it('SUPPORT ha read/write su support', () => {
      expect(hasPermission('SUPPORT', 'support', 'read')).toBe(true)
      expect(hasPermission('SUPPORT', 'support', 'write')).toBe(true)
    })

    it('SUPPORT ha solo read su crm', () => {
      expect(hasPermission('SUPPORT', 'crm', 'read')).toBe(true)
      expect(hasPermission('SUPPORT', 'crm', 'write')).toBe(false)
    })

    it('SUPPORT ha read su kb', () => {
      expect(hasPermission('SUPPORT', 'kb', 'read')).toBe(true)
      expect(hasPermission('SUPPORT', 'kb', 'write')).toBe(false)
    })

    it('SUPPORT NON ha accesso a erp, pm, content, admin', () => {
      expect(hasPermission('SUPPORT', 'erp', 'read')).toBe(false)
      expect(hasPermission('SUPPORT', 'pm', 'read')).toBe(false)
      expect(hasPermission('SUPPORT', 'admin', 'read')).toBe(false)
    })
  })

  describe('CLIENT ha accesso solo a portal', () => {
    it('CLIENT ha read/write su portal', () => {
      expect(hasPermission('CLIENT', 'portal', 'read')).toBe(true)
      expect(hasPermission('CLIENT', 'portal', 'write')).toBe(true)
    })

    it('CLIENT NON ha accesso a nessun altro modulo', () => {
      const otherModules: Module[] = ['crm', 'erp', 'pm', 'kb', 'content', 'support', 'admin', 'chat']
      for (const mod of otherModules) {
        expect(hasPermission('CLIENT', mod, 'read')).toBe(false)
      }
    })
  })
})

describe('Permissions - requirePermission', () => {
  it('non lancia errore se il permesso esiste', () => {
    expect(() => requirePermission('ADMIN', 'crm', 'read')).not.toThrow()
    expect(() => requirePermission('DEVELOPER', 'pm', 'write')).not.toThrow()
  })

  it('lancia errore con messaggio corretto se il permesso non esiste', () => {
    expect(() => requirePermission('CLIENT', 'crm', 'read'))
      .toThrow('Permission denied: CLIENT cannot read on crm')

    expect(() => requirePermission('DEVELOPER', 'erp', 'write'))
      .toThrow('Permission denied: DEVELOPER cannot write on erp')

    expect(() => requirePermission('SALES', 'admin', 'read'))
      .toThrow('Permission denied: SALES cannot read on admin')
  })
})

describe('Permissions - Chat per ruolo', () => {
  it('tutti i ruoli tranne CLIENT hanno accesso alla chat', () => {
    const chatRoles: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT']
    for (const role of chatRoles) {
      expect(hasPermission(role, 'chat', 'read')).toBe(true)
      expect(hasPermission(role, 'chat', 'write')).toBe(true)
    }
  })

  it('CLIENT NON ha accesso alla chat', () => {
    expect(hasPermission('CLIENT', 'chat', 'read')).toBe(false)
    expect(hasPermission('CLIENT', 'chat', 'write')).toBe(false)
  })

  it('solo ADMIN e MANAGER hanno admin sulla chat', () => {
    expect(hasPermission('ADMIN', 'chat', 'admin')).toBe(true)
    expect(hasPermission('MANAGER', 'chat', 'admin')).toBe(true)
    expect(hasPermission('SALES', 'chat', 'admin')).toBe(false)
    expect(hasPermission('PM', 'chat', 'admin')).toBe(false)
    expect(hasPermission('DEVELOPER', 'chat', 'admin')).toBe(false)
  })
})

describe('Permissions - Matrice accesso moduli per API', () => {
  // Questa tabella verifica quale ruolo ha accesso a quale modulo API
  const accessMatrix: Record<string, { module: Module; rolesAllowed: Role[]; rolesDenied: Role[] }> = {
    'Tasks API (pm:read)': {
      module: 'pm',
      rolesAllowed: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SALES', 'CONTENT'],
      rolesDenied: ['SUPPORT', 'CLIENT'],
    },
    'Chat API (chat:read)': {
      module: 'chat',
      rolesAllowed: ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
      rolesDenied: ['CLIENT'],
    },
    'Wiki API (kb:read)': {
      module: 'kb',
      rolesAllowed: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'CONTENT', 'SALES', 'SUPPORT'],
      rolesDenied: ['CLIENT'],
    },
    'CRM API (crm:read)': {
      module: 'crm',
      rolesAllowed: ['ADMIN', 'MANAGER', 'SALES', 'SUPPORT', 'PM'],
      rolesDenied: ['DEVELOPER', 'CONTENT', 'CLIENT'],
    },
    'ERP API (erp:read)': {
      module: 'erp',
      rolesAllowed: ['ADMIN', 'MANAGER', 'SALES'],
      rolesDenied: ['PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'],
    },
    'Support API (support:read)': {
      module: 'support',
      rolesAllowed: ['ADMIN', 'MANAGER', 'PM', 'DEVELOPER', 'SUPPORT'],
      rolesDenied: ['SALES', 'CONTENT', 'CLIENT'],
    },
  }

  for (const [name, { module, rolesAllowed, rolesDenied }] of Object.entries(accessMatrix)) {
    describe(name, () => {
      for (const role of rolesAllowed) {
        it(`${role} ha accesso`, () => {
          expect(hasPermission(role, module, 'read')).toBe(true)
        })
      }
      for (const role of rolesDenied) {
        it(`${role} NON ha accesso`, () => {
          expect(hasPermission(role, module, 'read')).toBe(false)
        })
      }
    })
  }
})
