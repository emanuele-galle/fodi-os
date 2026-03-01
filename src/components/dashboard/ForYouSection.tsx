'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { getDueUrgency } from '@/lib/task-utils'

interface TaskItem {
  id: string
  title: string
  dueDate: string | null
  status: string
  priority: string
  project?: { name: string } | null
}

interface ForYouSectionProps {
  tasks: TaskItem[]
  onTaskComplete: (taskId: string) => void
  onTaskPostpone: (taskId: string, newDate: string) => void
}

export function ForYouSection({ tasks, onTaskComplete, onTaskPostpone }: ForYouSectionProps) {
  const router = useRouter()

  const urgentTasks = tasks
    .filter(t => {
      const u = getDueUrgency(t.dueDate, t.status)
      return u === 'overdue' || u === 'today'
    })
    .slice(0, 3)

  if (urgentTasks.length === 0) return null

  return (
    <div className="md:hidden mb-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">Per te</span>
      </div>
      <div className="space-y-2">
        {urgentTasks.map(task => {
          const urgency = getDueUrgency(task.dueDate, task.status)
          return (
            <SwipeableRow
              key={task.id}
              leftAction={{
                label: 'Completato',
                icon: <CheckCircle2 className="h-4 w-4" />,
                color: '#10B981',
                onAction: () => onTaskComplete(task.id),
              }}
              rightAction={{
                label: 'Posticipa',
                icon: <Clock className="h-4 w-4" />,
                color: '#F59E0B',
                onAction: () => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  onTaskPostpone(task.id, tomorrow.toISOString())
                },
              }}
            >
              <div
                onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                className="flex items-center justify-between p-3 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.project && <p className="text-[10px] text-muted">{task.project.name}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                  urgency === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {urgency === 'overdue' ? 'Scaduta' : 'Oggi'}
                </span>
              </div>
            </SwipeableRow>
          )
        })}
      </div>
    </div>
  )
}
