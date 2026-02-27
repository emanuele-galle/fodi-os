import React from 'react'
import { ChevronDown, ChevronRight, Timer, ListTodo, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueUrgency, URGENCY_STYLES } from '@/lib/task-utils'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { TaskBadges, UrgencyBadge } from './TaskBadges'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, type Task, type TabKey } from './types'

interface TaskListViewProps {
  tasks: Task[]
  activeTab: TabKey
  userId: string
  onTaskClick: (id: string) => void
  expandedTasks?: Set<string>
  subtasksCache?: Record<string, Task[]>
  loadingSubtasks?: Set<string>
  onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void
}

export function TaskListView({ tasks, activeTab, userId, onTaskClick, expandedTasks, subtasksCache, loadingSubtasks, onToggleSubtasks }: TaskListViewProps) {
  return (
    <div className="rounded-xl border border-border/20 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Titolo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Stato</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Priorita</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Assegnato</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Progetto</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const urgency = getDueUrgency(task.dueDate, task.status)
            const urgencyStyles = URGENCY_STYLES[urgency]
            const hasSubtasks = task._count && task._count.subtasks > 0
            const isExpanded = expandedTasks?.has(task.id)
            const subs = subtasksCache?.[task.id]
            const isLoadingSubs = loadingSubtasks?.has(task.id)
            return (
              <React.Fragment key={task.id}>
              <tr
                onClick={() => onTaskClick(task.id)}
                className={cn(
                  'border-b border-border/10 hover:bg-secondary/8 cursor-pointer transition-colors group even:bg-secondary/[0.03]',
                  (urgency === 'overdue' || urgency === 'today') && `${urgencyStyles.bg}`,
                  isExpanded && 'border-b-0'
                )}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasSubtasks && onToggleSubtasks ? (
                      <button
                        onClick={(e) => onToggleSubtasks(task.id, e)}
                        className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                    {task.timerStartedAt && (
                      <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{task.title}</span>
                    <UrgencyBadge urgency={urgency} />
                    <TaskBadges task={task} activeTab={activeTab} userId={userId} />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <Badge status={task.status}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
                    {PRIORITY_LABELS[task.priority] || task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    {task.creator && task.creator.id !== userId && (
                      <>
                        <Avatar name={`${task.creator.firstName} ${task.creator.lastName}`} src={task.creator.avatarUrl} size="sm" />
                        <span className="text-xs text-muted">{task.creator.firstName}</span>
                        <ArrowRight className="h-3 w-3 text-muted mx-0.5" />
                      </>
                    )}
                    {(task.assignments?.length ?? 0) > 0 ? (
                      <AvatarStack users={task.assignments!.map(a => a.user)} size="sm" max={4} />
                    ) : task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={`${task.assignee.firstName} ${task.assignee.lastName}`}
                          src={task.assignee.avatarUrl}
                          size="sm"
                        />
                        <span className="text-sm text-muted">
                          {task.assignee.firstName} {task.assignee.lastName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  {task.dueDate ? (
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
                        {new Date(task.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="text-sm text-muted">
                    {task.project ? task.project.name : 'Personale'}
                  </span>
                </td>
              </tr>
              {isExpanded && (
                <tr className="border-b border-border/10">
                  <td colSpan={6} className="px-4 py-0 pb-3">
                    <div className="ml-6 pl-3 border-l-2 border-primary/20 space-y-1 pt-1">
                      {isLoadingSubs ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-3 w-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          <span className="text-xs text-muted">Caricamento subtask...</span>
                        </div>
                      ) : subs && subs.length > 0 ? (
                        subs.map((sub) => {
                          const subUrgency = getDueUrgency(sub.dueDate, sub.status)
                          const subUrgencyStyles = URGENCY_STYLES[subUrgency]
                          return (
                            <div
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); onTaskClick(sub.id) }}
                              className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors group/sub"
                              style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <ListTodo className="h-3 w-3 text-muted flex-shrink-0" />
                                <span className="text-xs font-medium truncate">{sub.title}</span>
                              </div>
                              <Badge status={sub.status} className="text-[9px] px-1.5 py-0 flex-shrink-0">
                                {STATUS_LABELS[sub.status] || sub.status}
                              </Badge>
                              <Badge status={sub.priority} className="text-[9px] px-1.5 py-0 flex-shrink-0 hidden md:inline-flex">
                                {PRIORITY_LABELS[sub.priority] || sub.priority}
                              </Badge>
                              {sub.assignee && (
                                <div className="flex items-center gap-1 flex-shrink-0 hidden lg:flex">
                                  <Avatar name={`${sub.assignee.firstName} ${sub.assignee.lastName}`} src={sub.assignee.avatarUrl} size="xs" />
                                  <span className="text-[10px] text-muted">{sub.assignee.firstName}</span>
                                </div>
                              )}
                              {sub.dueDate && (
                                <span className={cn('text-[10px] flex-shrink-0 hidden lg:inline', subUrgencyStyles.text)}>
                                  {new Date(sub.dueDate).toLocaleDateString('it-IT')}
                                </span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-xs text-muted py-1 block">Nessuna subtask</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
