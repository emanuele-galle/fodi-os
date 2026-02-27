export interface StaffUser {
  id: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
}

export interface Client {
  id: string
  companyName: string
}

export interface CrmTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  taskType: string | null
  dueDate: string | null
  completedAt: string | null
  clientId: string | null
  client: { id: string; companyName: string } | null
  assignee: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
  creator: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

export const TASK_TYPE_OPTIONS = [
  { value: '', label: 'Seleziona tipo' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CALL', label: 'Chiamata' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Riunione' },
  { value: 'PROPOSAL', label: 'Preventivo' },
  { value: 'OTHER', label: 'Altro' },
]

export const TASK_STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In corso' },
  { value: 'IN_REVIEW', label: 'In revisione' },
  { value: 'DONE', label: 'Completato' },
]

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completato',
}

export const TYPE_LABELS: Record<string, string> = {
  FOLLOW_UP: 'Follow-up',
  CALL: 'Chiamata',
  EMAIL: 'Email',
  MEETING: 'Riunione',
  PROPOSAL: 'Preventivo',
  OTHER: 'Altro',
}

export const KANBAN_COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE'] as const

export const NEXT_STATUS: Record<string, string> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
}

export const emptyNewTask = {
  title: '',
  description: '',
  clientId: '',
  assigneeId: '',
  priority: 'MEDIUM',
  taskType: 'FOLLOW_UP',
  dueDate: '',
}

export const emptyEditForm = {
  title: '',
  description: '',
  clientId: '',
  assigneeId: '',
  priority: '',
  taskType: '',
  status: '',
  dueDate: '',
}

export type NewTaskForm = typeof emptyNewTask
export type EditTaskForm = typeof emptyEditForm
