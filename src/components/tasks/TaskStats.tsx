import { Target, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import type { Task } from './types'

interface TaskStatsProps {
  tasks: Task[]
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const totalTasks = tasks.length
  const todoCount = tasks.filter((t) => t.status === 'TODO').length
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE' || t.status === 'CANCELLED') return false
    return new Date(t.dueDate) < new Date()
  }).length
  const completedCount = tasks.filter((t) => t.status === 'DONE').length

  const stats = [
    { label: 'Totale', value: totalTasks, icon: Target, color: 'text-primary' },
    { label: 'In Corso', value: inProgressCount, icon: Clock, color: 'text-accent' },
    { label: 'Scaduti', value: overdueCount, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Completati', value: completedCount, icon: CheckCircle2, color: 'text-accent' },
  ]

  const activeTotal = todoCount + inProgressCount + inReviewCount + completedCount
  const progressSegments = activeTotal > 0 ? [
    { key: 'DONE', count: completedCount, color: 'bg-emerald-500', label: 'Completati' },
    { key: 'IN_REVIEW', count: inReviewCount, color: 'bg-amber-500', label: 'In Revisione' },
    { key: 'IN_PROGRESS', count: inProgressCount, color: 'bg-blue-500', label: 'In Corso' },
    { key: 'TODO', count: todoCount, color: 'bg-gray-400', label: 'Da fare' },
  ] : []
  const completionPct = activeTotal > 0 ? Math.round((completedCount / activeTotal) * 100) : 0

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4 mb-4 animate-stagger">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200">
            <CardContent className="flex items-center gap-2.5 md:gap-3 py-2.5 md:py-3">
              <div className={`p-2.5 rounded-xl ${s.color}`} style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted font-medium truncate">{s.label}</p>
                <p className="text-xl font-bold animate-count-up">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeTotal > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-3 text-xs text-muted">
              {progressSegments.filter((s) => s.count > 0).map((s) => (
                <span key={s.key} className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  {s.label} ({s.count})
                </span>
              ))}
            </div>
            <span className="text-xs font-medium text-muted">{completionPct}%</span>
          </div>
          <div className="h-2 bg-secondary/60 rounded-full overflow-hidden flex">
            {progressSegments.filter((s) => s.count > 0).map((s) => (
              <div
                key={s.key}
                className={`${s.color} transition-all duration-500`}
                style={{ width: `${(s.count / activeTotal) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
