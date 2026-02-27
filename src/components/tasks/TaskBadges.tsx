import { Clock, ListTodo, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { URGENCY_STYLES, type DueUrgency } from '@/lib/task-utils'
import { Badge } from '@/components/ui/Badge'
import type { Task, TabKey } from './types'

export function TaskBadges({ task, activeTab, userId }: { task: Task; activeTab: TabKey; userId: string }) {
  const isCreator = task.creator?.id === userId
  const isAssignee = task.assignee?.id === userId || task.assignments?.some((a) => a.user.id === userId)

  return (
    <>
      {activeTab === 'team' && isCreator && (
        <Badge variant="info" className="text-[10px] px-1.5 py-0">Creata da te</Badge>
      )}
      {activeTab === 'team' && isAssignee && !isCreator && (
        <Badge variant="success" className="text-[10px] px-1.5 py-0">Assegnata a te</Badge>
      )}
      {(activeTab === 'delegated' || activeTab === 'team') && task._count && task._count.comments > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <MessageSquare className="h-3 w-3" />
          {task._count.comments}
        </span>
      )}
      {task.estimatedHours && task.estimatedHours > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <Clock className="h-3 w-3" />
          {task.estimatedHours}h
        </span>
      )}
      {task._count && task._count.subtasks > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <ListTodo className="h-3 w-3" />
          {task._count.subtasks}
        </span>
      )}
    </>
  )
}

export function UrgencyBadge({ urgency }: { urgency: DueUrgency }) {
  const styles = URGENCY_STYLES[urgency]
  if (!styles.label) return null
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', styles.badgeBg)}>
      {styles.label}
    </span>
  )
}
