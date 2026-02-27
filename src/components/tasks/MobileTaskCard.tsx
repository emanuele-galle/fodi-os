import React from 'react'
import { ChevronDown, ChevronRight, Timer, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueUrgency, URGENCY_STYLES } from '@/lib/task-utils'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { TaskBadges, UrgencyBadge } from './TaskBadges'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, type Task, type TabKey } from './types'

interface MobileTaskCardProps {
  task: Task
  activeTab: TabKey
  userId: string
  onClick: () => void
  expanded?: boolean
  subtasks?: Task[]
  loadingSubtasks?: boolean
  onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void
  onSubtaskClick?: (id: string) => void
}

export function MobileTaskCard({ task, activeTab, userId, onClick, expanded, subtasks, loadingSubtasks, onToggleSubtasks, onSubtaskClick }: MobileTaskCardProps) {
  const urgency = getDueUrgency(task.dueDate, task.status)
  const urgencyStyles = URGENCY_STYLES[urgency]

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation shadow-[var(--shadow-sm)] rounded-lg border bg-card',
        urgency === 'overdue' || urgency === 'today' ? `${urgencyStyles.border} ${urgencyStyles.bg}` : 'border-border/80'
      )}
      style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task._count && task._count.subtasks > 0 && onToggleSubtasks && (
            <button
              onClick={(e) => onToggleSubtasks(task.id, e)}
              className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
            </button>
          )}
          {task.timerStartedAt && (
            <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
          )}
          <span className="font-medium text-sm line-clamp-2">{task.title}</span>
        </div>
        <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge status={task.status}>
          {STATUS_LABELS[task.status] || task.status}
        </Badge>
        <UrgencyBadge urgency={urgency} />
        <TaskBadges task={task} activeTab={activeTab} userId={userId} />
        {task.project && (
          <span className="text-xs text-muted truncate max-w-[120px]">{task.project.name}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          {task.creator && task.creator.id !== userId && (
            <div className="flex items-center gap-1">
              <Avatar name={`${task.creator.firstName} ${task.creator.lastName}`} src={task.creator.avatarUrl} size="xs" />
              <span className="text-[10px] text-muted">{task.creator.firstName}</span>
              <ArrowRight className="h-3 w-3 text-muted" />
            </div>
          )}
          {(task.assignments?.length ?? 0) > 0 ? (
            <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
          ) : task.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar
                name={`${task.assignee.firstName} ${task.assignee.lastName}`}
                src={task.assignee.avatarUrl}
                size="sm"
              />
              <span>{task.assignee.firstName}</span>
            </div>
          ) : null}
        </div>
        {task.dueDate && (
          <span className={cn('text-xs', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
            {new Date(task.dueDate).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
      {expanded && (
        <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-2 pt-1">
          {loadingSubtasks ? (
            <div className="flex items-center gap-2 py-2">
              <div className="h-3 w-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted">Caricamento subtask...</span>
            </div>
          ) : subtasks && subtasks.length > 0 ? (
            subtasks.map((sub) => {
              const subUrgency = getDueUrgency(sub.dueDate, sub.status)
              return (
                <div
                  key={sub.id}
                  onClick={(e) => { e.stopPropagation(); onSubtaskClick?.(sub.id) }}
                  className={cn(
                    'p-2.5 rounded-md border bg-secondary/30 cursor-pointer hover:bg-secondary/60 transition-colors',
                    'border-border/50'
                  )}
                  style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{sub.title}</span>
                    <Badge status={sub.status} className="text-[9px] px-1 py-0">
                      {STATUS_LABELS[sub.status] || sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {sub.assignee && (
                      <div className="flex items-center gap-1">
                        <Avatar name={`${sub.assignee.firstName} ${sub.assignee.lastName}`} src={sub.assignee.avatarUrl} size="xs" />
                        <span className="text-[10px] text-muted">{sub.assignee.firstName}</span>
                      </div>
                    )}
                    {sub.dueDate && (
                      <span className={cn('text-[10px]', URGENCY_STYLES[subUrgency].text)}>
                        {new Date(sub.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <span className="text-xs text-muted py-1">Nessuna subtask</span>
          )}
        </div>
      )}
    </div>
  )
}
