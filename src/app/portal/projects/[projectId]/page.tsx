'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- handlers + dynamic styles */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Target, CheckCircle, Clock, ListTodo } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  milestoneId: string | null
  _count: { subtasks: number }
}

interface Milestone {
  id: string
  name: string
  dueDate: string | null
  status: string
}

interface ProjectDetail {
  id: string
  name: string
  slug: string
  status: string
  description: string | null
  startDate: string | null
  endDate: string | null
  deadline: string | null
  progress: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  tasks: Task[]
  milestones: Milestone[]
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  ACTIVE: 'Attivo',
  IN_PROGRESS: 'In Corso',
  ON_HOLD: 'In Pausa',
  REVIEW: 'In Revisione',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
  TODO: 'Da fare',
  DONE: 'Completata',
  IN_REVIEW: 'In Revisione',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export default function PortalProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProject = useCallback(() => {
    fetch(`/api/portal/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProject(data)
      })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  useRealtimeRefresh('project', fetchProject)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!project) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Progetto non trovato"
        description="Il progetto richiesto non esiste o non hai accesso."
      />
    )
  }

  // Group tasks by milestone
  const milestoneTasks = new Map<string | null, Task[]>()
  for (const task of project.tasks) {
    const key = task.milestoneId
    if (!milestoneTasks.has(key)) milestoneTasks.set(key, [])
    milestoneTasks.get(key)!.push(task)
  }

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push('/portal')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna alla panoramica
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge status={project.status}>
              {STATUS_LABELS[project.status] || project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted mt-1">{project.description}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Avanzamento</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{project.totalTasks}</p>
              <p className="text-xs text-muted-foreground">Task totali</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{project.completedTasks}</p>
              <p className="text-xs text-muted-foreground">Completate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{project.inProgressTasks}</p>
              <p className="text-xs text-muted-foreground">In corso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ListTodo className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {project.totalTasks - project.completedTasks - project.inProgressTasks}
              </p>
              <p className="text-xs text-muted-foreground">Da fare</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dates */}
      {(project.startDate || project.deadline) && (
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
          {project.startDate && (
            <span>Inizio: {new Date(project.startDate).toLocaleDateString('it-IT')}</span>
          )}
          {project.deadline && (
            <span>Scadenza: {new Date(project.deadline).toLocaleDateString('it-IT')}</span>
          )}
        </div>
      )}

      {/* Tasks grouped by milestone */}
      {project.tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nessuna attività"
          description="Non ci sono ancora attività per questo progetto."
        />
      ) : (
        <div className="space-y-6">
          {/* Milestones with their tasks */}
          {project.milestones.map((milestone) => {
            const tasks = milestoneTasks.get(milestone.id) || []
            if (tasks.length === 0) return null
            return (
              <div key={milestone.id}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{milestone.name}</h3>
                  <Badge status={milestone.status}>
                    {STATUS_LABELS[milestone.status] || milestone.status}
                  </Badge>
                  {milestone.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      entro {new Date(milestone.dueDate).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
                <TaskList tasks={tasks} />
              </div>
            )
          })}

          {/* Tasks without milestone */}
          {milestoneTasks.get(null) && milestoneTasks.get(null)!.length > 0 && (
            <div>
              {project.milestones.length > 0 && (
                <h3 className="text-sm font-semibold mb-3">Altre attività</h3>
              )}
              <TaskList tasks={milestoneTasks.get(null)!} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-1.5">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card"
        >
          <Badge status={task.status} className="shrink-0 text-[10px]">
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
          <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
          {task._count.subtasks > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
              {task._count.subtasks} sub
            </span>
          )}
          <Badge status={task.priority} className="shrink-0 text-[10px]">
            {PRIORITY_LABELS[task.priority] || task.priority}
          </Badge>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {new Date(task.dueDate).toLocaleDateString('it-IT')}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
