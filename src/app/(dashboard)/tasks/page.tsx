'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckSquare,
  Plus,
  ListTodo,
  LayoutGrid,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Tooltip } from '@/components/ui/Tooltip'
import { QuickTaskInput } from '@/components/tasks/QuickTaskInput'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { useUserPreferences } from '@/hooks/useUserPreferences'

interface TaskUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface TaskAssignment {
  id: string
  role: string
  user: TaskUser
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  boardColumn: string
  dueDate: string | null
  isPersonal: boolean
  assignee: TaskUser | null
  assignments?: TaskAssignment[]
  project: { id: string; name: string } | null
  createdAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'DONE', label: 'Completato' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  TODO: 'outline',
  IN_PROGRESS: 'success',
  IN_REVIEW: 'warning',
  DONE: 'default',
  CANCELLED: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In Corso',
  IN_REVIEW: 'In Revisione',
  DONE: 'Completato',
  CANCELLED: 'Cancellato',
}

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--color-muted)',
  MEDIUM: 'var(--color-primary)',
  HIGH: 'var(--color-warning)',
  URGENT: 'var(--color-destructive)',
}

const KANBAN_COLUMNS = [
  { key: 'TODO', label: 'Da fare', color: 'border-muted' },
  { key: 'IN_PROGRESS', label: 'In Corso', color: 'border-primary' },
  { key: 'IN_REVIEW', label: 'In Revisione', color: 'border-accent' },
  { key: 'DONE', label: 'Completato', color: 'border-primary' },
]

type ViewMode = 'list' | 'kanban'

export default function TasksPage() {
  const { preferences, updatePreference, loaded: prefsLoaded } = useUserPreferences()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [view, setView] = useState<ViewMode>('list')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Sync view preference
  useEffect(() => {
    if (prefsLoaded) setView(preferences.defaultView)
  }, [prefsLoaded, preferences.defaultView])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mine: 'true', limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (scopeFilter) params.set('scope', scopeFilter)
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, scopeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const totalTasks = tasks.length
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE' || t.status === 'CANCELLED') return false
    return new Date(t.dueDate) < new Date()
  }).length
  const completedCount = tasks.filter((t) => t.status === 'DONE').length

  function openTask(id: string) {
    setSelectedTaskId(id)
    setModalOpen(true)
  }

  const stats = [
    { label: 'Totale', value: totalTasks, icon: Target, color: 'text-primary' },
    { label: 'In Corso', value: inProgressCount, icon: Clock, color: 'text-accent' },
    { label: 'Scaduti', value: overdueCount, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Completati', value: completedCount, icon: CheckCircle2, color: 'text-accent' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <CheckSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">I Miei Task</h1>
            <p className="text-sm text-muted">Gestione attivita e scadenze</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <Tooltip content="Vista lista">
              <button
                onClick={() => { setView('list'); updatePreference('defaultView', 'list') }}
                className={`p-2 transition-colors ${view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                <ListTodo className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Vista kanban">
              <button
                onClick={() => { setView('kanban'); updatePreference('defaultView', 'kanban') }}
                className={`p-2 transition-colors ${view === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
        {stats.map((s) => (
          <Card key={s.label} className="accent-line-top shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200">
            <CardContent className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${s.color}`} style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider font-medium">{s.label}</p>
                <p className="text-2xl font-bold animate-count-up">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick task input */}
      <div className="mb-4">
        <QuickTaskInput onCreated={fetchTasks} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select
          options={[
            { value: '', label: 'Tutti i miei task' },
            { value: 'assigned', label: 'Assegnati a me' },
            { value: 'created', label: 'Creati da me' },
          ]}
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          options={PRIORITY_OPTIONS}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nessun task trovato"
          description={
            statusFilter || priorityFilter
              ? 'Prova a modificare i filtri.'
              : 'Usa il campo sopra per creare il tuo primo task.'
          }
        />
      ) : view === 'list' ? (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED'
              return (
                <div
                  key={task.id}
                  onClick={() => openTask(task.id)}
                  className="glass-card p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation shadow-[var(--shadow-sm)]"
                  style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm line-clamp-2">{task.title}</span>
                    <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} pulse={task.priority === 'URGENT'}>
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={STATUS_BADGE[task.status] || 'default'}>
                      {STATUS_LABELS[task.status] || task.status}
                    </Badge>
                    {task.project && (
                      <span className="text-xs text-muted truncate max-w-[120px]">{task.project.name}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <div className="flex items-center gap-2">
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
                      <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                        {new Date(task.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block">
            <ListView tasks={tasks} onTaskClick={openTask} />
          </div>
        </>
      ) : (
        <KanbanView tasks={tasks} onTaskClick={openTask} />
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedTaskId(null)
        }}
        onUpdated={fetchTasks}
      />
    </div>
  )
}

function ListView({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-border/80 overflow-hidden shadow-[var(--shadow-sm)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/40">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider">Titolo</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden md:table-cell">Stato</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden md:table-cell">Priorità</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden lg:table-cell">Assegnato</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden lg:table-cell">Scadenza</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase hidden sm:table-cell">Progetto</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors even:bg-secondary/20"
            >
              <td className="px-4 py-3">
                <span className="text-sm font-medium">{task.title}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <Badge variant={STATUS_BADGE[task.status] || 'default'}>
                  {STATUS_LABELS[task.status] || task.status}
                </Badge>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} pulse={task.priority === 'URGENT'}>
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </Badge>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
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
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                {task.dueDate ? (
                  <span
                    className={`text-sm ${
                      new Date(task.dueDate) < new Date() && task.status !== 'DONE'
                        ? 'text-destructive'
                        : 'text-muted'
                    }`}
                  >
                    {new Date(task.dueDate).toLocaleDateString('it-IT')}
                  </span>
                ) : (
                  <span className="text-sm text-muted">-</span>
                )}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-sm text-muted">
                  {task.project ? task.project.name : 'Personale'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KanbanView({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (id: string) => void }) {
  return (
    <div className="kanban-mobile-scroll md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key)
        return (
          <div key={col.key} className="flex flex-col min-w-[280px] md:min-w-0">
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color} bg-gradient-to-r from-secondary/50 to-transparent rounded-t-lg px-2 pt-2`}>
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted bg-card rounded-full px-2 py-0.5">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2 flex-1 animate-stagger">
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  className="!p-3 cursor-pointer"
                  onClick={() => onTaskClick(task.id)}
                  style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
                >
                  <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} pulse={task.priority === 'URGENT'}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    {task.project && (
                      <span className="text-xs text-muted truncate max-w-[100px]">
                        {task.project.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {(task.assignments?.length ?? 0) > 0 ? (
                      <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
                    ) : task.assignee ? (
                      <Avatar
                        name={`${task.assignee.firstName} ${task.assignee.lastName}`}
                        src={task.assignee.avatarUrl}
                        size="sm"
                      />
                    ) : (
                      <span />
                    )}
                    {task.dueDate && (
                      <span
                        className={`text-xs ${
                          new Date(task.dueDate) < new Date() && task.status !== 'DONE'
                            ? 'text-destructive'
                            : 'text-muted'
                        }`}
                      >
                        {new Date(task.dueDate).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-6 text-sm text-muted">
                  Nessun task
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
