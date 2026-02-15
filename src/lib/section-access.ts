import type { Role } from '@/generated/prisma/client'
import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Building2,
  Users,
  FolderKanban,
  CalendarDays,
  Euro,
  BookOpen,
  Film,
  LifeBuoy,
  UsersRound,
  Settings,
  GraduationCap,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────

export type Section =
  | 'dashboard'
  | 'tasks'
  | 'chat'
  | 'internal'
  | 'crm'
  | 'projects'
  | 'calendar'
  | 'erp'
  | 'kb'
  | 'content'
  | 'support'
  | 'training'
  | 'team'
  | 'settings'

export interface SectionPermission {
  view: boolean
  edit: boolean
}

export type SectionAccessMap = Record<Section, SectionPermission>

// ── Constants ──────────────────────────────────────────────────

export const SECTIONS: Section[] = [
  'dashboard',
  'tasks',
  'chat',
  'internal',
  'crm',
  'projects',
  'calendar',
  'erp',
  'kb',
  'content',
  'support',
  'training',
  'team',
  'settings',
]

export const SECTION_LABELS: Record<Section, string> = {
  dashboard: 'Dashboard',
  tasks: 'I Miei Task',
  chat: 'Chat',
  internal: 'Azienda',
  crm: 'CRM',
  projects: 'Progetti',
  calendar: 'Calendario',
  erp: 'Contabilità',
  kb: 'Knowledge Base',
  content: 'Contenuti',
  support: 'Supporto',
  training: 'Formazione',
  team: 'Team',
  settings: 'Impostazioni',
}

export const SECTION_ICONS: Record<Section, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  tasks: CheckSquare,
  chat: MessageCircle,
  internal: Building2,
  crm: Users,
  projects: FolderKanban,
  calendar: CalendarDays,
  erp: Euro,
  kb: BookOpen,
  content: Film,
  support: LifeBuoy,
  training: GraduationCap,
  team: UsersRound,
  settings: Settings,
}

export const HREF_TO_SECTION: Record<string, Section> = {
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/chat': 'chat',
  '/internal': 'internal',
  '/crm': 'crm',
  '/projects': 'projects',
  '/calendar': 'calendar',
  '/erp': 'erp',
  '/kb': 'kb',
  '/content': 'content',
  '/support': 'support',
  '/training': 'training',
  '/team': 'team',
  '/settings': 'settings',
}

// Role → sections allowed (replicates current sidebar filtering logic)
const ROLE_SECTION_VIEW: Record<Role, Section[]> = {
  ADMIN: SECTIONS,
  MANAGER: SECTIONS,
  SALES: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'erp', 'kb', 'support', 'training', 'team', 'settings'],
  PM: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'kb', 'support', 'training', 'team', 'settings'],
  DEVELOPER: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'kb', 'support', 'training', 'team', 'settings'],
  CONTENT: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'kb', 'content', 'training', 'team', 'settings'],
  SUPPORT: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'calendar', 'kb', 'support', 'training', 'team', 'settings'],
  CLIENT: ['dashboard', 'tasks', 'chat', 'calendar', 'training', 'team', 'settings'],
}

// Roles that have edit by default (ADMIN, MANAGER always edit; others view-only on some sections)
const ADMIN_ROLES: Role[] = ['ADMIN', 'MANAGER']

// ── Functions ──────────────────────────────────────────────────

/** Get the default section access map for a role (replicates current sidebar logic) */
export function getDefaultSectionAccess(role: Role): SectionAccessMap {
  const allowed = ROLE_SECTION_VIEW[role] || []
  const isAdmin = ADMIN_ROLES.includes(role)

  const map = {} as SectionAccessMap
  for (const section of SECTIONS) {
    const canView = allowed.includes(section)
    map[section] = {
      view: canView,
      edit: canView && isAdmin,
    }
  }
  return map
}

/** Resolve effective permissions: override takes priority, fallback to role defaults */
export function getEffectiveSectionAccess(
  role: Role,
  sectionAccess: SectionAccessMap | null | undefined
): SectionAccessMap {
  const defaults = getDefaultSectionAccess(role)
  if (!sectionAccess) return defaults
  // Merge: only accept valid sections
  const result = { ...defaults }
  for (const section of SECTIONS) {
    if (sectionAccess[section]) {
      result[section] = {
        view: !!sectionAccess[section].view,
        edit: !!sectionAccess[section].edit,
      }
    }
  }
  return result
}

/** Validate a sectionAccess JSON blob */
export function isValidSectionAccess(value: unknown): value is SectionAccessMap {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  for (const section of SECTIONS) {
    if (!(section in obj)) return false
    const perm = obj[section]
    if (!perm || typeof perm !== 'object') return false
    const p = perm as Record<string, unknown>
    if (typeof p.view !== 'boolean' || typeof p.edit !== 'boolean') return false
  }
  return true
}
