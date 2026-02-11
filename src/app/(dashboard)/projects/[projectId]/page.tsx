'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit, Plus, Clock, CheckCircle2, Target, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { GanttChart } from '@/components/projects/GanttChart'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  boardColumn: string
  dueDate: string | null
  estimatedHours: number | null
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
}

interface Milestone {
  id: string
  name: string
  dueDate: string | null
  status: string
  tasks: Task[]
}

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string | null
  billable: boolean
  user: { firstName: string; lastName: string }
  task?: { title: string } | null
}

interface ProjectDetail {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  priority: string
  startDate: string | null
  endDate: string | null
  budgetAmount: string | null
  budgetHours: number | null
  color: string
  client?: { companyName: string } | null
  workspace: { name: string }
  tasks: Task[]
  milestones: Milestone[]
  _count?: { tasks: number }
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PLANNING: 'default', IN_PROGRESS: 'success', ON_HOLD: 'warning', REVIEW: 'default', COMPLETED: 'outline', CANCELLED: 'destructive',
}
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
}
const TASK_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  TODO: 'default', IN_PROGRESS: 'success', IN_REVIEW: 'warning', DONE: 'outline', CANCELLED: 'destructive',
}
const STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Pianificazione', IN_PROGRESS: 'In Corso', ON_HOLD: 'In Pausa',
  REVIEW: 'In Revisione', COMPLETED: 'Completato', CANCELLED: 'Cancellato',
}
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}
const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: 'Da Fare', IN_PROGRESS: 'In Corso', IN_REVIEW: 'In Revisione',
  DONE: 'Completato', CANCELLED: 'Cancellato',
}

const BOARD_COLUMNS = [
  { key: 'todo', label: 'Da Fare' },
  { key: 'in_progress', label: 'In Corso' },
  { key: 'in_review', label: 'In Revisione' },
  { key: 'done', label: 'Completato' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalColumn, setTaskModalColumn] = useState('todo')
  const [submitting, setSubmitting] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
    fetch(`/api/time?projectId=${projectId}&limit=50`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.items) setTimeEntries(d.items) })
  }, [fetchProject, projectId])

  function openAddTask(column: string) {
    setTaskModalColumn(column)
    setTaskModalOpen(true)
  }

  const COLUMN_STATUS_MAP: Record<string, string> = {
    todo: 'TODO',
    in_progress: 'IN_PROGRESS',
    in_review: 'IN_REVIEW',
    done: 'DONE',
  }

  async function handleColumnChange(taskId: string, newColumn: string) {
    // Optimistic update
    setProject((prev) => {
      if (!prev) return prev
      const tasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, boardColumn: newColumn, status: COLUMN_STATUS_MAP[newColumn] || t.status } : t
      )
      return { ...prev, tasks }
    })

    // PATCH API
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardColumn: newColumn,
        status: COLUMN_STATUS_MAP[newColumn] || undefined,
      }),
    })
  }

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = { projectId, boardColumn: taskModalColumn }
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.estimatedHours) body.estimatedHours = parseFloat(body.estimatedHours as string)
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setTaskModalOpen(false)
        fetchProject()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Progetto non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const allTasks = project.tasks || []
  const doneTasks = allTasks.filter((t) => t.status === 'DONE').length
  const totalEstimated = allTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0)
  const totalLogged = timeEntries.reduce((s, e) => s + e.hours, 0)

  const tasksByColumn: Record<string, Task[]> = {}
  for (const col of BOARD_COLUMNS) tasksByColumn[col.key] = []
  for (const task of allTasks) {
    const col = tasksByColumn[task.boardColumn]
    if (col) col.push(task)
    else if (tasksByColumn['todo']) tasksByColumn['todo'].push(task)
  }

  const boardTab = (
    <KanbanBoard
      tasksByColumn={tasksByColumn}
      onColumnChange={handleColumnChange}
      onAddTask={openAddTask}
    />
  )

  const listTab = (
    <div className="overflow-x-auto">
      {allTasks.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun task creato.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted bg-secondary/30">
              <th className="py-3 px-4 font-medium">Titolo</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Assegnato</th>
              <th className="py-3 px-4 font-medium">Stato</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Priorità</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Scadenza</th>
            </tr>
          </thead>
          <tbody>
            {allTasks.map((task) => (
              <tr key={task.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors duration-200 even:bg-secondary/20">
                <td className="py-3 px-4 font-medium">{task.title}</td>
                <td className="py-3 px-4 text-muted hidden md:table-cell">
                  {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '—'}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={TASK_STATUS_BADGE[task.status] || 'default'}>{TASK_STATUS_LABEL[task.status] || task.status}</Badge>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <Badge variant={PRIORITY_BADGE[task.priority] || 'default'}>{PRIORITY_LABEL[task.priority] || task.priority}</Badge>
                </td>
                <td className="py-3 px-4 text-muted hidden sm:table-cell">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('it-IT') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  const milestonesTab = (
    <div>
      {allTasks.length === 0 && (project.milestones || []).length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun task o milestone con date definite.</p>
      ) : (
        <GanttChart
          tasks={allTasks}
          milestones={project.milestones || []}
          onTaskClick={() => {}}
        />
      )}
    </div>
  )

  const timeTab = (
    <div>
      {timeEntries.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessuna registrazione ore.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted bg-secondary/30">
                <th className="py-3 px-4 font-medium">Data</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Utente</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Task</th>
                <th className="py-3 px-4 font-medium">Ore</th>
                <th className="py-3 px-4 font-medium hidden lg:table-cell">Descrizione</th>
                <th className="py-3 px-4 font-medium">Fatturabile</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors duration-200 even:bg-secondary/20">
                  <td className="py-3 px-4">{new Date(entry.date).toLocaleDateString('it-IT')}</td>
                  <td className="py-3 px-4 hidden sm:table-cell">{entry.user.firstName} {entry.user.lastName}</td>
                  <td className="py-3 px-4 text-muted hidden md:table-cell">{entry.task?.title || '—'}</td>
                  <td className="py-3 px-4 font-medium">{entry.hours}h</td>
                  <td className="py-3 px-4 text-muted truncate max-w-xs hidden lg:table-cell">{entry.description || '—'}</td>
                  <td className="py-3 px-4">
                    <Badge variant={entry.billable ? 'success' : 'outline'}>
                      {entry.billable ? 'Si' : 'No'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna alla lista progetti
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.client && (
            <p className="text-sm text-muted mt-1">{project.client.companyName} - {project.workspace.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[project.status] || 'default'}>{STATUS_LABEL[project.status] || project.status}</Badge>
          <Badge variant={PRIORITY_BADGE[project.priority] || 'default'}>{PRIORITY_LABEL[project.priority] || project.priority}</Badge>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full text-primary" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Task Totali</p>
              <p className="text-2xl font-bold animate-count-up">{allTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full text-accent" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Completati</p>
              <p className="text-2xl font-bold animate-count-up">{doneTasks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full text-[var(--color-warning)]" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Stimate</p>
              <p className="text-2xl font-bold animate-count-up">{totalEstimated}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full text-muted" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Registrate</p>
              <p className="text-2xl font-bold animate-count-up">{totalLogged}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        tabs={[
          { id: 'board', label: 'Board', content: boardTab },
          { id: 'list', label: 'Lista', content: listTab },
          { id: 'milestones', label: 'Timeline', content: milestonesTab },
          { id: 'time', label: 'Tempi', content: timeTab },
        ]}
      />

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Nuovo Task" size="md">
        <form onSubmit={handleAddTask} className="space-y-4">
          <Input name="title" label="Titolo *" required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Select name="priority" label="Priorità" options={PRIORITY_OPTIONS} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="dueDate" label="Scadenza" type="date" />
            <Input name="estimatedHours" label="Ore Stimate" type="number" step="0.5" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Crea Task'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
