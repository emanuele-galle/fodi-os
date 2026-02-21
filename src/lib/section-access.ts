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
  DIR_COMMERCIALE: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'erp', 'support', 'team', 'settings'],
  DIR_TECNICO: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'content', 'support', 'team', 'settings'],
  DIR_SUPPORT: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'support', 'team', 'settings'],
  COMMERCIALE: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'erp', 'support', 'team', 'settings'],
  PM: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'projects', 'calendar', 'support', 'team', 'settings'],
  DEVELOPER: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'support', 'team', 'settings'],
  CONTENT: ['dashboard', 'tasks', 'chat', 'internal', 'projects', 'calendar', 'content', 'team', 'settings'],
  SUPPORT: ['dashboard', 'tasks', 'chat', 'internal', 'crm', 'calendar', 'support', 'team', 'settings'],
  CLIENT: ['dashboard', 'tasks', 'chat', 'calendar', 'team', 'settings'],
}

// Director primary sections (edit access)
const DIRECTOR_PRIMARY_SECTIONS: Partial<Record<Role, Section[]>> = {
  DIR_COMMERCIALE: ['crm', 'erp'],
  DIR_TECNICO: ['projects', 'content'],
  DIR_SUPPORT: ['support', 'crm'],
}

// ── Functions ──────────────────────────────────────────────────

/** Get the default section access map for a role (replicates current sidebar logic) */
export function getDefaultSectionAccess(role: Role): SectionAccessMap {
  const allowed = ROLE_SECTION_VIEW[role] || []
  const isAdmin = role === 'ADMIN'
  const directorPrimary = DIRECTOR_PRIMARY_SECTIONS[role]

  const map = {} as SectionAccessMap
  for (const section of SECTIONS) {
    const canView = allowed.includes(section)
    const canEdit = isAdmin || (!!directorPrimary && directorPrimary.includes(section))
    map[section] = {
      view: canView,
      edit: canView && canEdit,
    }
  }
  return map
}

/** Resolve effective permissions: override takes priority, fallback to role defaults */
export function getEffectiveSectionAccess(
  role: Role,
  sectionAccess: SectionAccessMap | null | undefined,
  customRoleSectionAccess?: SectionAccessMap | null,
): SectionAccessMap {
  // If custom role section access provided, use it as base instead of role defaults
  const defaults = customRoleSectionAccess
    ? mergeSectionAccess(customRoleSectionAccess)
    : getDefaultSectionAccess(role)
  if (!sectionAccess) return defaults
  // Merge user-level overrides on top
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

/** Build a full SectionAccessMap from a partial custom role section access */
function mergeSectionAccess(custom: SectionAccessMap): SectionAccessMap {
  const map = {} as SectionAccessMap
  for (const section of SECTIONS) {
    if (custom[section]) {
      map[section] = {
        view: !!custom[section].view,
        edit: !!custom[section].edit,
      }
    } else {
      map[section] = { view: false, edit: false }
    }
  }
  return map
}

export { ROLE_SECTION_VIEW }

