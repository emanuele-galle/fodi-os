import { describe, it, expect } from 'vitest'
import { hasPermission, requirePermission } from '@/lib/permissions'
import type { Module, Permission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

const ALL_ROLES: Role[] = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']
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

  describe('DIR_COMMERCIALE ha admin su CRM/ERP, readonly su altri', () => {
    it('DIR_COMMERCIALE ha tutti i permessi su crm', () => {
      expect(hasPermission('DIR_COMMERCIALE', 'crm', 'read')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'crm', 'write')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'crm', 'delete')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'crm', 'approve')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'crm', 'admin')).toBe(true)
    })

    it('DIR_COMMERCIALE ha tutti i permessi su erp', () => {
      expect(hasPermission('DIR_COMMERCIALE', 'erp', 'read')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'erp', 'admin')).toBe(true)
    })

    it('DIR_COMMERCIALE ha read/write su pm', () => {
      expect(hasPermission('DIR_COMMERCIALE', 'pm', 'read')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'pm', 'write')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'pm', 'delete')).toBe(false)
    })

    it('DIR_COMMERCIALE ha solo read su admin', () => {
      expect(hasPermission('DIR_COMMERCIALE', 'admin', 'read')).toBe(true)
      expect(hasPermission('DIR_COMMERCIALE', 'admin', 'write')).toBe(false)
    })

    it('DIR_COMMERCIALE NON ha accesso a portal', () => {
      expect(hasPermission('DIR_COMMERCIALE', 'portal', 'read')).toBe(false)
    })
  })

  describe('DIR_TECNICO ha admin su PM/Content, readonly su altri', () => {
    it('DIR_TECNICO ha tutti i permessi su pm', () => {
      expect(hasPermission('DIR_TECNICO', 'pm', 'read')).toBe(true)
      expect(hasPermission('DIR_TECNICO', 'pm', 'admin')).toBe(true)
    })

    it('DIR_TECNICO ha tutti i permessi su content', () => {
      expect(hasPermission('DIR_TECNICO', 'content', 'read')).toBe(true)
      expect(hasPermission('DIR_TECNICO', 'content', 'admin')).toBe(true)
    })

    it('DIR_TECNICO ha solo read su crm', () => {
      expect(hasPermission('DIR_TECNICO', 'crm', 'read')).toBe(true)
      expect(hasPermission('DIR_TECNICO', 'crm', 'write')).toBe(false)
    })

    it('DIR_TECNICO ha solo read su erp', () => {
      expect(hasPermission('DIR_TECNICO', 'erp', 'read')).toBe(true)
      expect(hasPermission('DIR_TECNICO', 'erp', 'write')).toBe(false)
    })
  })

  describe('DIR_SUPPORT ha admin su Support, read/write su CRM', () => {
    it('DIR_SUPPORT ha tutti i permessi su support', () => {
      expect(hasPermission('DIR_SUPPORT', 'support', 'read')).toBe(true)
      expect(hasPermission('DIR_SUPPORT', 'support', 'admin')).toBe(true)
    })

    it('DIR_SUPPORT ha read/write su crm', () => {
      expect(hasPermission('DIR_SUPPORT', 'crm', 'read')).toBe(true)
      expect(hasPermission('DIR_SUPPORT', 'crm', 'write')).toBe(true)
      expect(hasPermission('DIR_SUPPORT', 'crm', 'delete')).toBe(false)
    })

    it('DIR_SUPPORT ha read/write su pm', () => {
      expect(hasPermission('DIR_SUPPORT', 'pm', 'read')).toBe(true)
      expect(hasPermission('DIR_SUPPORT', 'pm', 'write')).toBe(true)
      expect(hasPermission('DIR_SUPPORT', 'pm', 'delete')).toBe(false)
    })
  })

  describe('COMMERCIALE ha accesso a CRM, ERP, PM, KB, Support, Chat', () => {
    it('COMMERCIALE ha read/write su crm', () => {
      expect(hasPermission('COMMERCIALE', 'crm', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'crm', 'write')).toBe(true)
    })

    it('COMMERCIALE ha read/write su erp', () => {
      expect(hasPermission('COMMERCIALE', 'erp', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'erp', 'write')).toBe(true)
    })

    it('COMMERCIALE ha read/write/delete su pm', () => {
      expect(hasPermission('COMMERCIALE', 'pm', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'pm', 'write')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'pm', 'delete')).toBe(true)
    })

    it('COMMERCIALE ha read su kb', () => {
      expect(hasPermission('COMMERCIALE', 'kb', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'kb', 'write')).toBe(false)
    })

    it('COMMERCIALE ha read su support', () => {
      expect(hasPermission('COMMERCIALE', 'support', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'support', 'write')).toBe(false)
    })

    it('COMMERCIALE ha read/write su content', () => {
      expect(hasPermission('COMMERCIALE', 'content', 'read')).toBe(true)
      expect(hasPermission('COMMERCIALE', 'content', 'write')).toBe(true)
    })

    it('COMMERCIALE NON ha accesso a admin, portal', () => {
      expect(hasPermission('COMMERCIALE', 'admin', 'read')).toBe(false)
      expect(hasPermission('COMMERCIALE', 'portal', 'read')).toBe(false)
    })
  })

  describe('PM ha accesso a pm, kb, chat', () => {
    it('PM ha read/write/approve su pm', () => {
      expect(hasPermission('PM', 'pm', 'read')).toBe(true)
      expect(hasPermission('PM', 'pm', 'write')).toBe(true)
      expect(hasPermission('PM', 'pm', 'approve')).toBe(true)
    })

    it('PM ha read su kb', () => {
      expect(hasPermission('PM', 'kb', 'read')).toBe(true)
      expect(hasPermission('PM', 'kb', 'write')).toBe(false)
    })

    it('PM ha read su crm', () => {
      expect(hasPermission('PM', 'crm', 'read')).toBe(true)
      expect(hasPermission('PM', 'crm', 'write')).toBe(false)
    })

    it('PM ha read su support', () => {
      expect(hasPermission('PM', 'support', 'read')).toBe(true)
      expect(hasPermission('PM', 'support', 'write')).toBe(false)
    })

    it('PM ha read/write su content', () => {
      expect(hasPermission('PM', 'content', 'read')).toBe(true)
      expect(hasPermission('PM', 'content', 'write')).toBe(true)
    })

    it('PM NON ha accesso a erp, admin, portal', () => {
      expect(hasPermission('PM', 'erp', 'read')).toBe(false)
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

    it('CONTENT ha read/write su pm', () => {
      expect(hasPermission('CONTENT', 'pm', 'read')).toBe(true)
      expect(hasPermission('CONTENT', 'pm', 'write')).toBe(true)
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

    it('SUPPORT ha read/write su pm', () => {
      expect(hasPermission('SUPPORT', 'pm', 'read')).toBe(true)
      expect(hasPermission('SUPPORT', 'pm', 'write')).toBe(true)
    })

    it('SUPPORT ha read/write su content', () => {
      expect(hasPermission('SUPPORT', 'content', 'read')).toBe(true)
      expect(hasPermission('SUPPORT', 'content', 'write')).toBe(true)
    })

    it('SUPPORT NON ha accesso a erp, admin', () => {
      expect(hasPermission('SUPPORT', 'erp', 'read')).toBe(false)
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

    expect(() => requirePermission('COMMERCIALE', 'admin', 'read'))
      .toThrow('Permission denied: COMMERCIALE cannot read on admin')
  })
})

describe('Permissions - Chat per ruolo', () => {
  it('tutti i ruoli tranne CLIENT hanno accesso alla chat', () => {
    const chatRoles: Role[] = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT']
    for (const role of chatRoles) {
      expect(hasPermission(role, 'chat', 'read')).toBe(true)
      expect(hasPermission(role, 'chat', 'write')).toBe(true)
    }
  })

  it('CLIENT NON ha accesso alla chat', () => {
    expect(hasPermission('CLIENT', 'chat', 'read')).toBe(false)
    expect(hasPermission('CLIENT', 'chat', 'write')).toBe(false)
  })

  it('solo ADMIN e Direttori hanno admin sulla chat', () => {
    expect(hasPermission('ADMIN', 'chat', 'admin')).toBe(true)
    expect(hasPermission('DIR_COMMERCIALE', 'chat', 'admin')).toBe(true)
    expect(hasPermission('DIR_TECNICO', 'chat', 'admin')).toBe(true)
    expect(hasPermission('DIR_SUPPORT', 'chat', 'admin')).toBe(true)
    expect(hasPermission('COMMERCIALE', 'chat', 'admin')).toBe(false)
    expect(hasPermission('PM', 'chat', 'admin')).toBe(false)
    expect(hasPermission('DEVELOPER', 'chat', 'admin')).toBe(false)
  })
})

describe('Permissions - Matrice accesso moduli per API', () => {
  const accessMatrix: Record<string, { module: Module; rolesAllowed: Role[]; rolesDenied: Role[] }> = {
    'Tasks API (pm:read)': {
      module: 'pm',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
      rolesDenied: ['CLIENT'],
    },
    'Chat API (chat:read)': {
      module: 'chat',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
      rolesDenied: ['CLIENT'],
    },
    'Wiki API (kb:read)': {
      module: 'kb',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
      rolesDenied: ['CLIENT'],
    },
    'CRM API (crm:read)': {
      module: 'crm',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'SUPPORT', 'PM'],
      rolesDenied: ['DEVELOPER', 'CONTENT', 'CLIENT'],
    },
    'ERP API (erp:read)': {
      module: 'erp',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE'],
      rolesDenied: ['PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'],
    },
    'Support API (support:read)': {
      module: 'support',
      rolesAllowed: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'SUPPORT'],
      rolesDenied: ['CONTENT', 'CLIENT'],
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
