import type { Role } from '@/generated/prisma/client'

export type Module = 'crm' | 'erp' | 'pm' | 'kb' | 'content' | 'support' | 'admin' | 'portal' | 'chat' | 'training'
export type Permission = 'read' | 'write' | 'delete' | 'approve' | 'admin'

type PermissionMap = Partial<Record<Module, Permission[]>>

const ROLE_PERMISSIONS: Record<Role, PermissionMap> = {
  ADMIN: {
    crm: ['read', 'write', 'delete', 'approve', 'admin'],
    erp: ['read', 'write', 'delete', 'approve', 'admin'],
    pm: ['read', 'write', 'delete', 'approve', 'admin'],
    kb: ['read', 'write', 'delete', 'approve', 'admin'],
    content: ['read', 'write', 'delete', 'approve', 'admin'],
    support: ['read', 'write', 'delete', 'approve', 'admin'],
    admin: ['read', 'write', 'delete', 'approve', 'admin'],
    portal: ['read', 'write', 'delete', 'approve', 'admin'],
    chat: ['read', 'write', 'admin'],
    training: ['read', 'write', 'delete', 'approve', 'admin'],
  },
  MANAGER: {
    crm: ['read', 'write', 'delete', 'approve'],
    erp: ['read', 'write', 'delete', 'approve'],
    pm: ['read', 'write', 'delete', 'approve'],
    kb: ['read', 'write'],
    content: ['read', 'write', 'approve'],
    support: ['read', 'write', 'approve'],
    admin: ['read'],
    chat: ['read', 'write', 'admin'],
    training: ['read', 'write'],
  },
  SALES: {
    crm: ['read', 'write'],
    erp: ['read', 'write'],
    pm: ['read'],
    kb: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  PM: {
    crm: ['read'],
    pm: ['read', 'write', 'approve'],
    kb: ['read', 'write'],
    support: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  DEVELOPER: {
    pm: ['read', 'write'],
    kb: ['read', 'write'],
    support: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  CONTENT: {
    content: ['read', 'write'],
    pm: ['read'],
    kb: ['read', 'write'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  SUPPORT: {
    support: ['read', 'write'],
    crm: ['read'],
    kb: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  CLIENT: {
    portal: ['read', 'write'],
  },
}

export function hasPermission(role: Role, module: Module, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]?.[module]
  if (!perms) return false
  return perms.includes(permission)
}

export function requirePermission(role: Role, module: Module, permission: Permission): void {
  if (!hasPermission(role, module, permission)) {
    throw new Error(`Permission denied: ${role} cannot ${permission} on ${module}`)
  }
}
