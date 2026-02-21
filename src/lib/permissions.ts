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
  DIR_COMMERCIALE: {
    crm: ['read', 'write', 'delete', 'approve', 'admin'],
    erp: ['read', 'write', 'delete', 'approve', 'admin'],
    pm: ['read', 'write'],
    kb: ['read', 'write', 'approve'],
    content: ['read', 'write'],
    support: ['read'],
    admin: ['read'],
    chat: ['read', 'write', 'admin'],
    training: ['read', 'write'],
  },
  DIR_TECNICO: {
    pm: ['read', 'write', 'delete', 'approve', 'admin'],
    content: ['read', 'write', 'delete', 'approve', 'admin'],
    crm: ['read'],
    erp: ['read'],
    kb: ['read', 'write', 'approve'],
    support: ['read', 'write'],
    chat: ['read', 'write', 'admin'],
    training: ['read', 'write'],
  },
  DIR_SUPPORT: {
    support: ['read', 'write', 'delete', 'approve', 'admin'],
    crm: ['read', 'write'],
    pm: ['read', 'write'],
    erp: ['read'],
    kb: ['read', 'write', 'approve'],
    content: ['read', 'write'],
    chat: ['read', 'write', 'admin'],
    training: ['read', 'write'],
  },
  COMMERCIALE: {
    crm: ['read', 'write', 'delete', 'approve'],
    erp: ['read', 'write'],
    pm: ['read', 'write', 'delete'],
    kb: ['read'],
    content: ['read', 'write'],
    support: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  PM: {
    crm: ['read'],
    pm: ['read', 'write', 'approve'],
    kb: ['read'],
    content: ['read', 'write'],
    support: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  DEVELOPER: {
    pm: ['read', 'write'],
    kb: ['read'],
    content: ['read', 'write'],
    support: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  CONTENT: {
    content: ['read', 'write'],
    pm: ['read', 'write'],
    kb: ['read'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  SUPPORT: {
    support: ['read', 'write'],
    crm: ['read'],
    pm: ['read', 'write'],
    kb: ['read'],
    content: ['read', 'write'],
    chat: ['read', 'write'],
    training: ['read'],
  },
  CLIENT: {
    portal: ['read', 'write'],
  },
}

export const ADMIN_ROLES: Role[] = ['ADMIN']
export const DIRECTOR_ROLES: Role[] = ['DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT']

export function hasPermission(
  role: Role,
  module: Module,
  permission: Permission,
  customModulePermissions?: Record<string, string[]> | null,
): boolean {
  // If custom permissions provided, use those instead of static map
  if (customModulePermissions) {
    const perms = customModulePermissions[module]
    if (!perms) return false
    return perms.includes(permission)
  }
  const perms = ROLE_PERMISSIONS[role]?.[module]
  if (!perms) return false
  return perms.includes(permission)
}

export function requirePermission(
  role: Role,
  module: Module,
  permission: Permission,
  customModulePermissions?: Record<string, string[]> | null,
): void {
  if (!hasPermission(role, module, permission, customModulePermissions)) {
    throw new Error(`Permission denied: ${role} cannot ${permission} on ${module}`)
  }
}

export { ROLE_PERMISSIONS }
