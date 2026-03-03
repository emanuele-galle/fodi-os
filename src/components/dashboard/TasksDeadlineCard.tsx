'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- handlers in render */

import { useRouter } from 'next/navigation'
import { CalendarCheck, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { getDueUrgency } from '@/lib/task-utils'

interface TaskItem {
  id: string
  title: string
  dueDate: string | null
  status: string
  priority: string
  project?: { name: string } | null
}

interface TasksDeadlineCardProps {
  tasks: TaskItem[]
  fullWidth?: boolean
}

export function TasksDeadlineCard({ tasks, fullWidth }: TasksDeadlineCardProps) {
  const router = useRouter()

  return (
    <Card className={fullWidth ? '' : 'lg:col-span-2'}>
      <CardContent>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>Task in Scadenza</CardTitle>
              <p className="text-[11px] text-muted mt-0.5">Le tue task ordinate per scadenza</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/tasks')}
            className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all"
          >
            Vedi tutti
          </button>
        </div>
        {tasks.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nessun task in scadenza" description="Ottimo lavoro! Non ci sono task con scadenza imminente." />
        ) : (
          <div className="space-y-1">
            {(() => {
              const overdueTasks = tasks.filter(t => getDueUrgency(t.dueDate, t.status) === 'overdue')
              const todayTasks = tasks.filter(t => getDueUrgency(t.dueDate, t.status) === 'today')
              const otherTasks = tasks.filter(t => {
                const u = getDueUrgency(t.dueDate, t.status)
                return u !== 'overdue' && u !== 'today'
              })

              const sections = [
                { label: 'Scadute', tasks: overdueTasks, color: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500' },
                { label: 'Oggi', tasks: todayTasks, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500' },
                { label: 'Prossime', tasks: otherTasks, color: 'text-muted', dotColor: 'bg-blue-400' },
              ].filter(s => s.tasks.length > 0)

              return sections.map(section => (
                <div key={section.label}>
                  <div className="flex items-center gap-2 py-1.5 px-1">
                    <span className={`h-2 w-2 rounded-full ${section.dotColor}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${section.color}`}>{section.label}</span>
                  </div>
                  {section.tasks.map(task => (
                    <div key={task.id} onClick={() => router.push(`/tasks?taskId=${task.id}`)} className="flex items-center justify-between py-2.5 px-3 -mx-1 rounded-xl hover:bg-secondary/50 active:bg-secondary/60 transition-colors cursor-pointer touch-manipulation">
                      <div className="min-w-0">
                        <p className="text-[15px] md:text-sm font-medium truncate">{task.title}</p>
                        {task.project && (
                          <p className="text-[12px] text-muted mt-0.5">{task.project.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <StatusBadge
                          leftLabel={task.priority === 'URGENT' ? 'Urgente' : task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Bassa'}
                          rightLabel={task.dueDate ? new Date(task.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '\u2014'}
                          variant={task.priority === 'URGENT' ? 'error' : task.priority === 'HIGH' ? 'warning' : task.priority === 'MEDIUM' ? 'info' : 'default'}
                          pulse={task.priority === 'URGENT'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
