'use client'

import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PRIORITY_BADGE } from '@/lib/crm-constants'
import Link from 'next/link'
import { KANBAN_COLUMNS, STATUS_LABELS, NEXT_STATUS, PRIORITY_LABELS, type CrmTask } from './types'

interface TaskKanbanViewProps {
  tasks: CrmTask[]
  isOverdue: (task: CrmTask) => boolean
  onStatusChange: (taskId: string, newStatus: string) => void
}

export function TaskKanbanView({ tasks, isOverdue, onStatusChange }: TaskKanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLUMNS.map(status => {
        const statusTasks = tasks.filter(t => t.status === status)
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
              <Badge variant="outline" className="text-xs">{statusTasks.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px] rounded-lg bg-secondary/20 p-2">
              {statusTasks.map(task => (
                <div key={task.id} className="bg-card border border-border/40 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    {NEXT_STATUS[status] && (
                      <button
                        onClick={() => onStatusChange(task.id, NEXT_STATUS[status])}
                        className="flex-shrink-0 p-1 rounded hover:bg-secondary/50 text-muted hover:text-foreground transition-colors"
                        title={`Sposta a ${STATUS_LABELS[NEXT_STATUS[status]]}`}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {task.client && (
                    <Link href={`/crm/${task.clientId}`} className="text-xs text-primary hover:underline block">
                      {task.client.companyName}
                    </Link>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-xs">
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    {task.dueDate && (
                      <span className={`text-[11px] ${isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}`}>
                        {new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {task.assignee && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} src={task.assignee.avatarUrl} size="xs" />
                      <span className="text-[11px] text-muted">{task.assignee.firstName} {task.assignee.lastName}</span>
                    </div>
                  )}
                </div>
              ))}
              {statusTasks.length === 0 && (
                <p className="text-xs text-muted text-center py-8">Nessuna attività</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
