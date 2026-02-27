export interface Project {
  id: string
  name: string
  status: string
  priority: string
  color: string | null
  startDate: string | null
  endDate: string | null
  client?: { companyName: string } | null
  _count?: { tasks: number }
  completedTasks?: number
  budgetAmount?: string | null
  budgetHours?: number | null
}

export interface ClientOption {
  id: string
  companyName: string
}

export type ViewMode = 'grid' | 'table' | 'kanban'
export type SortField = 'name' | 'createdAt' | 'endDate' | 'priority' | 'client' | 'status' | 'budget'
export type SortDirection = 'asc' | 'desc'

export const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'PLANNING', label: 'Pianificazione' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'ON_HOLD', label: 'In Pausa' },
  { value: 'REVIEW', label: 'Revisione' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

export const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione', IN_PROGRESS: 'In Corso', ON_HOLD: 'In Pausa', REVIEW: 'Revisione', COMPLETED: 'Completato', CANCELLED: 'Cancellato',
}
export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'Tutte le priorita' },
  ...PRIORITY_OPTIONS,
]

export const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'createdAt', label: 'Data creazione' },
  { value: 'endDate', label: 'Scadenza' },
  { value: 'priority', label: 'Priorita' },
  { value: 'client', label: 'Cliente' },
  { value: 'status', label: 'Stato' },
  { value: 'budget', label: 'Budget' },
]

export const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'var(--color-primary)',
  IN_PROGRESS: 'var(--color-accent)',
  ON_HOLD: 'var(--color-warning)',
  REVIEW: 'var(--color-primary)',
  COMPLETED: 'var(--color-muted)',
  CANCELLED: 'var(--color-destructive)',
}

export const KANBAN_COLUMNS = [
  { key: 'PLANNING', label: 'Pianificazione' },
  { key: 'IN_PROGRESS', label: 'In Corso' },
  { key: 'ON_HOLD', label: 'In Pausa' },
  { key: 'REVIEW', label: 'Revisione' },
  { key: 'COMPLETED', label: 'Completato' },
]

export const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
