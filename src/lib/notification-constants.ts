import { Bell, MessageSquare, UserCheck, CheckCircle, FileText, Video, AlarmClock, Clock, AlertTriangle } from 'lucide-react'

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown> | null
  groupKey?: string | null
  groupCount: number
  lastActorName?: string | null
}

export const NOTIF_ICONS: Record<string, typeof Bell> = {
  task_comment: MessageSquare,
  ticket_comment: MessageSquare,
  task_assigned: UserCheck,
  task_completed: CheckCircle,
  task_status_changed: CheckCircle,
  MEETING: Video,
  file_uploaded: FileText,
  reminder: AlarmClock,
  reminder_manual: AlarmClock,
  task_overdue: AlertTriangle,
  task_due_today: Clock,
  task_due_tomorrow: AlarmClock,
}

export function getNotifIcon(type: string) {
  return NOTIF_ICONS[type] || Bell
}

export const NOTIF_TYPE_LABELS: Record<string, string> = {
  task_comment: 'Commento task',
  ticket_comment: 'Commento ticket',
  task_assigned: 'Task assegnato',
  task_completed: 'Task completato',
  task_status_changed: 'Stato task',
  task_updated: 'Task modificata',
  task_created: 'Nuovo task',
  MEETING: 'Riunione',
  file_uploaded: 'File caricato',
  reminder: 'Promemoria',
  reminder_manual: 'Promemoria',
  task_overdue: 'Task in ritardo',
  task_due_today: 'Scadenza oggi',
  task_due_tomorrow: 'Scadenza domani',
}

/** All notification types that can be configured in user preferences */
export const CONFIGURABLE_NOTIF_TYPES = [
  { type: 'task_comment', label: 'Commento su task' },
  { type: 'task_assigned', label: 'Task assegnato' },
  { type: 'task_status_changed', label: 'Cambio stato task' },
  { type: 'task_completed', label: 'Task completata' },
  { type: 'task_updated', label: 'Modifica task' },
  { type: 'task_overdue', label: 'Task scaduta' },
  { type: 'task_due_today', label: 'Scadenza oggi' },
  { type: 'task_due_tomorrow', label: 'Scadenza domani' },
  { type: 'ticket_comment', label: 'Commento ticket' },
] as const
