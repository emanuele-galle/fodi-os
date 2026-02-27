import type { SectionAccessMap } from '@/lib/section-access'
export { ROLES, ROLE_LABELS, ROLE_BADGE } from '@/lib/constants'

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
