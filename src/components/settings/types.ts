import type { SectionAccessMap } from '@/lib/section-access'

export interface CustomRoleOption {
  id: string
  name: string
  color: string | null
}

export interface UserItem {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  role: string
  customRoleId: string | null
  customRole: CustomRoleOption | null
  isActive: boolean
  avatarUrl: string | null
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  sectionAccess: SectionAccessMap | null
}

export interface UserPermission {
  module: string
  permission: string
}

export interface UserStats {
  tasksCompleted: number
  tasksTotal: number
  hoursLogged: number
}

export const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DIR_COMMERCIALE', label: 'Dir. Commerciale' },
  { value: 'DIR_TECNICO', label: 'Dir. Tecnico' },
  { value: 'DIR_SUPPORT', label: 'Dir. Supporto' },
  { value: 'COMMERCIALE', label: 'Commerciale' },
  { value: 'PM', label: 'Resp. Progetto' },
  { value: 'DEVELOPER', label: 'Sviluppatore' },
  { value: 'CONTENT', label: 'Contenuti' },
  { value: 'SUPPORT', label: 'Assistenza' },
  { value: 'CLIENT', label: 'Cliente' },
]

export const ROLE_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  ADMIN: 'destructive',
  DIR_COMMERCIALE: 'warning',
  DIR_TECNICO: 'warning',
  DIR_SUPPORT: 'warning',
  COMMERCIALE: 'success',
  PM: 'default',
  DEVELOPER: 'default',
  CONTENT: 'outline',
  SUPPORT: 'outline',
  CLIENT: 'outline',
}

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

export const MODULES = [
  { key: 'crm', label: 'CRM' },
  { key: 'erp', label: 'ERP' },
  { key: 'pm', label: 'Project Management' },
  { key: 'kb', label: 'Knowledge Base' },
  { key: 'content', label: 'Contenuti' },
  { key: 'support', label: 'Supporto' },
  { key: 'admin', label: 'Admin' },
]

export const PERMISSIONS = ['read', 'write', 'delete', 'approve', 'admin']
export const PERMISSION_LABELS: Record<string, string> = {
  read: 'Lettura',
  write: 'Scrittura',
  delete: 'Elimina',
  approve: 'Approva',
  admin: 'Admin',
}

export type ModalTab = 'profile' | 'permissions' | 'sections'
