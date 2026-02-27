import { Flame, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueUrgency, URGENCY_STYLES } from '@/lib/task-utils'
import type { Task } from './types'

interface TaskFocusPanelProps {
  tasks: Task[]
  onTaskClick: (id: string) => void
}

export function TaskFocusPanel({ tasks, onTaskClick }: TaskFocusPanelProps) {
  if (tasks.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">Focus del Giorno</h3>
        <span className="text-xs bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {tasks.map(task => {
          const urgency = getDueUrgency(task.dueDate, task.status)
          const styles = URGENCY_STYLES[urgency]
          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/80 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className={cn('h-3.5 w-3.5 flex-shrink-0', styles.text)} />
                <span className="text-sm font-medium truncate">{task.title}</span>
              </div>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0', styles.badgeBg)}>
                {styles.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
