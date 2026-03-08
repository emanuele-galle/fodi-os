import {
  LayoutDashboard,
  CheckSquare,
  MessageCircle,
  Bell,
  Building2,
  Users,
  FolderKanban,
  CalendarDays,
  Euro,
  LifeBuoy,
  UsersRound,
  BookOpen,
  Library,
  Settings,
  Bot,
} from 'lucide-react'
import type { Role } from '@/generated/prisma/client'

export type NavGroup = 'main' | 'work' | 'admin' | 'team' | 'system'

export interface NavChild {
  label: string
  href: string
}

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: Role[]
  children?: NavChild[]
  group: NavGroup
}

export const GROUP_LABELS: Record<NavGroup, string | null> = {
  main: 'Principale',
  work: 'Lavoro',
  admin: 'Gestione',
  team: 'Team & Risorse',
  system: null,
}

export const GROUP_ORDER: NavGroup[] = ['main', 'work', 'admin', 'team', 'system']

export const navigation: NavItem[] = [
  // Principale
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'I Miei Task', href: '/tasks', icon: CheckSquare, group: 'main' },
  {
    label: 'Calendario',
    href: '/calendar',
    icon: CalendarDays,
    children: [
      { label: 'Eventi', href: '/calendar' },
      { label: 'Disponibilità', href: '/calendar/availability' },
    ],
    group: 'main',
  },
  { label: 'Chat', href: '/chat', icon: MessageCircle, group: 'main' },
  { label: 'Assistente AI', href: '/ai', icon: Bot, group: 'main' },
  { label: 'Notifiche', href: '/notifications', icon: Bell, group: 'main' },
  // Lavoro
  {
    label: 'Progetti Clienti',
    href: '/projects',
    icon: FolderKanban,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT'],
    children: [
      { label: 'Lista', href: '/projects' },
      { label: 'Analytics', href: '/projects/analytics' },
    ],
    group: 'work',
  },
  {
    label: 'Supporto',
    href: '/support',
    icon: LifeBuoy,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM', 'DEVELOPER', 'SUPPORT'],
    group: 'work',
  },
  // Gestione
  {
    label: 'Contabilita',
    href: '/erp',
    icon: Euro,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'COMMERCIALE'],
    children: [
      { label: 'Panoramica', href: '/erp/panoramica' },
      { label: 'Movimenti', href: '/erp/movimenti' },
      { label: 'Conti', href: '/erp/accounts' },
      { label: 'Preventivi', href: '/erp/quotes' },
      { label: 'Documenti', href: '/erp/documenti' },
      { label: 'Impostazioni', href: '/erp/settings' },
    ],
    group: 'admin',
  },
  {
    label: 'CRM',
    href: '/crm',
    icon: Users,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'SUPPORT'],
    children: [
      { label: 'Dashboard', href: '/crm/dashboard' },
      { label: 'Clienti', href: '/crm' },
      { label: 'Pipeline', href: '/crm/pipeline' },
      { label: 'Attività', href: '/crm/tasks' },
      { label: 'Leads', href: '/crm/leads' },
      { label: 'Gestione Tag', href: '/crm/settings/tags' },
    ],
    group: 'admin',
  },
  {
    label: 'Azienda',
    href: '/internal',
    icon: Building2,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    group: 'admin',
  },
  // Team & Risorse
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
    group: 'team',
  },
  {
    label: 'Knowledge Base',
    href: '/kb',
    icon: Library,
    roles: ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT'],
    group: 'team',
  },
  // System (no title)
  { label: 'Guida', href: '/guide', icon: BookOpen, group: 'system' },
  {
    label: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Profilo', href: '/settings' },
      { label: 'Fatturazione', href: '/settings/billing' },
      { label: 'Utenti', href: '/settings/users' },
      { label: 'Assistente AI', href: '/settings/ai' },
      { label: 'Sistema', href: '/settings/system' },
    ],
    group: 'system',
  },
]
