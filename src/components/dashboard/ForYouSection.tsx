'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- handlers + motion objects */

import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock } from 'lucide-react'
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
      <p className="mobile-section-header">Per te</p>
      <div className="ios-grouped-section">
        {urgentTasks.map(task => {
          const urgency = getDueUrgency(task.dueDate, task.status)
          return (
            <SwipeableRow
              key={task.id}
              leftAction={{
                label: 'Completato',
                icon: <CheckCircle2 className="h-4 w-4" />,
                color: '#34C759',
                onAction: () => onTaskComplete(task.id),
              }}
              rightAction={{
                label: 'Posticipa',
                icon: <Clock className="h-4 w-4" />,
                color: '#FF9500',
                onAction: () => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  onTaskPostpone(task.id, tomorrow.toISOString())
                },
              }}
            >
              <div
                onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                className="ios-grouped-row cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">{task.title}</p>
                  {task.project && <p className="text-[12px] text-muted mt-0.5">{task.project.name}</p>}
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-3 ${
                  urgency === 'overdue' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
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
