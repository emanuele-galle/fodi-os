'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit, Plus, Clock, CheckCircle2, Target, Timer, Video,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiUserSelect } from '@/components/ui/MultiUserSelect'
import { Skeleton } from '@/components/ui/Skeleton'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { GanttChart } from '@/components/projects/GanttChart'
import { ProjectChat } from '@/components/chat/ProjectChat'

interface ClientOption {
  id: string
  companyName: string
}

interface WorkspaceOption {
  id: string
  name: string
}

interface TaskUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  boardColumn: string
  dueDate: string | null
  estimatedHours: number | null
  assignee?: TaskUser | null
  assignments?: { id: string; role: string; user: TaskUser }[]
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
  client?: { id: string; companyName: string } | null
  workspace: { id: string; name: string }
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

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Pianificazione' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'ON_HOLD', label: 'In Pausa' },
  { value: 'REVIEW', label: 'In Revisione' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
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
  const [creatingMeet, setCreatingMeet] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl?: string | null }[]>([])
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([])
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    priority: '',
    clientId: '',
    workspaceId: '',
    startDate: '',
    endDate: '',
    budgetAmount: '',
    budgetHours: '',
    color: '',
  })

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
    fetch('/api/clients?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.items) setClients(d.items)
    })
    fetch('/api/workspaces').then((r) => r.ok ? r.json() : null).then((d) => {
      if (Array.isArray(d)) setWorkspaces(d)
      else if (d?.items) setWorkspaces(d.items)
    })
    fetch('/api/users?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.users) setTeamMembers(d.users)
      else if (d?.items) setTeamMembers(d.items)
      else if (Array.isArray(d)) setTeamMembers(d)
    })
  }, [fetchProject, projectId])

  async function handleProjectMeet() {
    if (creatingMeet || !project) return
    setCreatingMeet(true)
    try {
      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Meet - ${project.name}`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        window.open(data.meetLink, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setCreatingMeet(false)
    }
  }

  function openEditModal() {
    if (!project) return
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || '',
      priority: project.priority || '',
      clientId: project.client?.id || '',
      workspaceId: project.workspace?.id || '',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      budgetAmount: project.budgetAmount || '',
      budgetHours: project.budgetHours != null ? String(project.budgetHours) : '',
      color: project.color || '',
    })
    setEditModalOpen(true)
  }

  async function handleEditProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    if (body.budgetAmount) body.budgetAmount = parseFloat(body.budgetAmount as string)
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    // Allow clearing optional fields
    if (!editForm.clientId) body.clientId = null
    if (!editForm.startDate) body.startDate = null
    if (!editForm.endDate) body.endDate = null
    if (!editForm.budgetAmount) body.budgetAmount = null
    if (!editForm.budgetHours) body.budgetHours = null
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditModalOpen(false)
        fetchProject()
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  function openAddTask(column: string) {
    setTaskModalColumn(column)
    setTaskAssigneeIds([])
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
    if (taskAssigneeIds.length > 0) body.assigneeIds = taskAssigneeIds
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
                  {(task.assignments?.length ?? 0) > 0 ? (
                    <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
                  ) : task.assignee ? (
                    `${task.assignee.firstName} ${task.assignee.lastName}`
                  ) : '—'}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{project.name}</h1>
            <Badge variant={STATUS_BADGE[project.status] || 'default'}>{STATUS_LABEL[project.status] || project.status}</Badge>
            <Badge variant={PRIORITY_BADGE[project.priority] || 'default'}>{PRIORITY_LABEL[project.priority] || project.priority}</Badge>
          </div>
          {project.client && (
            <p className="text-sm text-muted mt-1 truncate">{project.client.companyName} - {project.workspace.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleProjectMeet} disabled={creatingMeet} className="touch-manipulation">
            <Video className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{creatingMeet ? 'Avvio...' : 'Meet'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={openEditModal} className="touch-manipulation">
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Modifica</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-primary" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Task Totali</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{allTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-accent" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Completati</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{doneTasks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-[var(--color-warning)]" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Stimate</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{totalEstimated}h</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-muted" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Registrate</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{totalLogged}h</p>
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
          { id: 'chat', label: 'Chat', content: <ProjectChat projectId={projectId} /> },
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
          <MultiUserSelect
            users={teamMembers}
            selected={taskAssigneeIds}
            onChange={setTaskAssigneeIds}
            label="Assegnatari"
            placeholder="Seleziona assegnatari..."
          />
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

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Modifica Progetto" size="lg">
        <form onSubmit={handleEditProject} className="space-y-4">
          <Input
            label="Nome Progetto *"
            required
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Workspace"
              value={editForm.workspaceId}
              onChange={(e) => setEditForm((f) => ({ ...f, workspaceId: e.target.value }))}
              options={[
                { value: '', label: 'Seleziona workspace' },
                ...workspaces.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              label="Cliente"
              value={editForm.clientId}
              onChange={(e) => setEditForm((f) => ({ ...f, clientId: e.target.value }))}
              options={[
                { value: '', label: 'Nessun cliente' },
                ...clients.map((c) => ({ value: c.id, label: c.companyName })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Stato"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              options={STATUS_OPTIONS}
            />
            <Select
              label="Priorità"
              value={editForm.priority}
              onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data Inizio"
              type="date"
              value={editForm.startDate}
              onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="Data Fine"
              type="date"
              value={editForm.endDate}
              onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Budget (EUR)"
              type="number"
              step="0.01"
              value={editForm.budgetAmount}
              onChange={(e) => setEditForm((f) => ({ ...f, budgetAmount: e.target.value }))}
            />
            <Input
              label="Ore Previste"
              type="number"
              value={editForm.budgetHours}
              onChange={(e) => setEditForm((f) => ({ ...f, budgetHours: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Colore</label>
            <input
              type="color"
              value={editForm.color || '#3b82f6'}
              onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
              className="h-10 w-20 rounded-md border border-border cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
