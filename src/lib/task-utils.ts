export type DueUrgency = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'normal' | 'none'

export function getDueUrgency(dueDate: string | null | undefined, status: string): DueUrgency {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return 'none'

  const now = new Date()
  const due = new Date(dueDate)

  // Reset time for day comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  const diffMs = dueDay.getTime() - todayStart.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'this_week'
  return 'normal'
}

export const URGENCY_STYLES: Record<DueUrgency, {
  border: string
  bg: string
  text: string
  label: string
  badgeBg: string
}> = {
  overdue: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/5',
    text: 'text-red-600 dark:text-red-400',
    label: 'Scaduta',
    badgeBg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  today: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/5',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Oggi',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  },
  tomorrow: {
    border: 'border-orange-400/40',
    bg: 'bg-orange-400/5',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Domani',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  },
  this_week: {
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Questa settimana',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  normal: {
    border: 'border-border/80',
    bg: '',
    text: 'text-muted',
    label: '',
    badgeBg: '',
  },
  none: {
    border: 'border-border/80',
    bg: '',
    text: 'text-muted',
    label: '',
    badgeBg: '',
  },
}
