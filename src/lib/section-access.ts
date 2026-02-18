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
  Film,
  LifeBuoy,
  UsersRound,
  Settings,
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
  | 'content'
  | 'support'
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
  'content',
  'support',
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
  content: 'Contenuti',
  support: 'Supporto',
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
  content: Film,
  support: LifeBuoy,
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
  '/content': 'content',
  '/support': 'support',
  '/team': 'team',
  '/settings': 'settings',
}

// Role → sections allowed (replicates current sidebar filtering logic)
const ROLE_SECTION_VIEW: Record<Role, Section[]> = {
  ADMIN: SECTIONS,
  MANAGER: SECTIONS,
  SALES: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'erp', 'support', 'team', 'settings'],
  PM: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'support', 'team', 'settings'],
  DEVELOPER: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'support', 'team', 'settings'],
  CONTENT: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'content', 'team', 'settings'],
  SUPPORT: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'calendar', 'support', 'team', 'settings'],
  CLIENT: ['dashboard', 'tasks', 'chat', 'calendar', 'team', 'settings'],
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

