import type { User, Send, Users } from 'lucide-react'

export interface TaskUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface TaskAssignment {
  id: string
  role: string
  user: TaskUser
}

export interface Task {
  id: string
  title: string
  status: string
  priority: string
  boardColumn: string
  dueDate: string | null
  isPersonal: boolean
  assignee: TaskUser | null
  creator?: TaskUser | null
  assignments?: TaskAssignment[]
  project: { id: string; name: string } | null
  createdAt: string
  estimatedHours?: number | null
  timerStartedAt: string | null
  timerUserId: string | null
  _count?: { comments: number; subtasks: number }
}

export const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'DONE', label: 'Completato' },
]

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In Corso',
  IN_REVIEW: 'In Revisione',
  DONE: 'Completato',
  CANCELLED: 'Cancellato',
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--color-muted)',
  MEDIUM: 'var(--color-primary)',
  HIGH: 'var(--color-warning)',
  URGENT: 'var(--color-destructive)',
}

export const KANBAN_COLUMNS = [
  { key: 'TODO', label: 'Da fare', color: 'border-gray-400', headerBg: 'bg-gray-500/10', headerText: 'text-gray-600 dark:text-gray-300' },
  { key: 'IN_PROGRESS', label: 'In Corso', color: 'border-blue-500', headerBg: 'bg-blue-500/10', headerText: 'text-blue-600 dark:text-blue-400' },
  { key: 'IN_REVIEW', label: 'In Revisione', color: 'border-amber-500', headerBg: 'bg-amber-500/10', headerText: 'text-amber-600 dark:text-amber-400' },
  { key: 'DONE', label: 'Completato', color: 'border-emerald-500', headerBg: 'bg-emerald-500/10', headerText: 'text-emerald-600 dark:text-emerald-400' },
]

export const PRIORITY_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export type ViewMode = 'list' | 'kanban'
export type TabKey = 'mine' | 'delegated' | 'team'

export interface TabDef {
  key: TabKey
  label: string
  icon: typeof User
  adminOnly?: boolean
}

export function sortTasks(tasks: Task[]): Task[] {
  const now = new Date()
  return [...tasks].sort((a, b) => {
    const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== 'DONE' && a.status !== 'CANCELLED'
    const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'DONE' && b.status !== 'CANCELLED'
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    const aPrio = PRIORITY_ORDER[a.priority] || 0
    const bPrio = PRIORITY_ORDER[b.priority] || 0
    if (aPrio !== bPrio) return bPrio - aPrio

    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
