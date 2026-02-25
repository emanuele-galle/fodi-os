'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, Edit, Plus, Clock, CheckCircle2, Target, Timer, Video, Trash2, Users, UserPlus, X,
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
import { ColorSwatches } from '@/components/ui/ColorSwatches'
import { Skeleton } from '@/components/ui/Skeleton'
import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(() => import('@/components/projects/KanbanBoard').then(m => ({ default: m.KanbanBoard })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const GanttChart = dynamic(() => import('@/components/projects/GanttChart').then(m => ({ default: m.GanttChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const ProjectChat = dynamic(() => import('@/components/chat/ProjectChat').then(m => ({ default: m.ProjectChat })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const TaskDetailModal = dynamic(() => import('@/components/tasks/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })), {
  ssr: false,
})
const ProjectFolders = dynamic(() => import('@/components/projects/ProjectFolders').then(m => ({ default: m.ProjectFolders })), {
  loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
})
const ProjectAttachments = dynamic(() => import('@/components/projects/ProjectAttachments').then(m => ({ default: m.ProjectAttachments })), {
const ProjectLinks = dynamic(() => import("@/components/projects/ProjectLinks").then(m => ({ default: m.ProjectLinks })), {
  loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
})
  loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
})

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
  folderId: string | null
  folderName?: string | null
  folderColor?: string | null
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

interface ProjectMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl: string | null }
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
  members: ProjectMember[]
  _count?: { tasks: number }
}

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
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
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const fromInternal = searchParams.get('from') === 'internal'

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalColumn, setTaskModalColumn] = useState('todo')
  const [submitting, setSubmitting] = useState(false)
  const [creatingMeet, setCreatingMeet] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl?: string | null }[]>([])
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
  const [folders, setFolders] = useState<{ id: string; name: string; description: string | null; color: string; sortOrder: number; parentId?: string | null; _count?: { tasks: number }; children?: { id: string; name: string; description: string | null; color: string; sortOrder: number; _count?: { tasks: number } }[] }[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [memberUserIds, setMemberUserIds] = useState<string[]>([])
  const [addingMembers, setAddingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
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

  const taskForm = useFormPersist(`new-task:${projectId}`, {
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    estimatedHours: '',
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

  const fetchFolders = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/folders`)
    if (res.ok) {
      const data = await res.json()
      setFolders(data)
    }
  }, [projectId])

  useEffect(() => {
    // Load user session for role check
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.user) setUserRole(data.user.role) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Fetch all data in parallel to avoid waterfall
    Promise.all([
      fetchProject(),
      fetchFolders(),
      fetch(`/api/time?projectId=${projectId}&limit=50`).then((r) => r.ok ? r.json() : null),
      fetch('/api/clients?limit=200').then((r) => r.ok ? r.json() : null),
      fetch('/api/workspaces').then((r) => r.ok ? r.json() : null),
      fetch('/api/users?limit=200').then((r) => r.ok ? r.json() : null),
    ]).then(([, , timeData, clientsData, workspacesData, usersData]) => {
      if (timeData?.items) setTimeEntries(timeData.items)
      if (clientsData?.items) setClients(clientsData.items)
      if (Array.isArray(workspacesData)) setWorkspaces(workspacesData)
      else if (workspacesData?.items) setWorkspaces(workspacesData.items)
      if (usersData?.users) setTeamMembers(usersData.users)
      else if (usersData?.items) setTeamMembers(usersData.items)
      else if (Array.isArray(usersData)) setTeamMembers(usersData)
    })
  }, [fetchProject, fetchFolders, projectId])

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
    // Convert dates from YYYY-MM-DD to ISO 8601 datetime
    if (body.startDate) body.startDate = new Date(body.startDate as string).toISOString()
    if (body.endDate) body.endDate = new Date(body.endDate as string).toISOString()
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
        setEditError(null)
        fetchProject()
      } else {
        const err = await res.json().catch(() => null)
        setEditError(err?.error || 'Errore durante il salvataggio')
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDeleteProject() {
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push(fromInternal ? '/internal' : '/projects')
      }
    } finally {
      setDeleteSubmitting(false)
    }
  }

  async function handleAddMembers() {
    if (memberUserIds.length === 0) return
    setAddingMembers(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: memberUserIds }),
      })
      if (res.ok) {
        setMemberUserIds([])
        setAddMemberModalOpen(false)
        fetchProject()
      }
    } finally {
      setAddingMembers(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingMemberId(userId)
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProject()
      }
    } finally {
      setRemovingMemberId(null)
    }
  }

  function openTaskDetail(taskId: string) {
    setTaskDetailId(taskId)
    setTaskDetailOpen(true)
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
    const body: Record<string, unknown> = { projectId, boardColumn: taskModalColumn }
    for (const [k, v] of Object.entries(taskForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    if (body.estimatedHours) body.estimatedHours = parseFloat(body.estimatedHours as string)
    if (body.dueDate) body.dueDate = new Date(body.dueDate as string).toISOString()
    if (taskAssigneeIds.length > 0) body.assigneeIds = taskAssigneeIds
    if (selectedFolderId) body.folderId = selectedFolderId
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        taskForm.reset()
        setTaskAssigneeIds([])
        setTaskModalOpen(false)
        fetchProject()
      } else {
        const err = await res.json().catch(() => null)
        console.error('[Task create failed]', res.status, err)
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
        <Button variant="outline" className="mt-4" onClick={() => router.push(fromInternal ? '/internal' : '/projects')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          {fromInternal ? 'Torna ai progetti interni' : 'Torna alla lista'}
        </Button>
      </div>
    )
  }

  // Build folder map including children for task label lookups
  const folderMap: Record<string, { id: string; name: string; color: string }> = {}
  for (const f of folders) {
    folderMap[f.id] = f
    for (const c of (f.children ?? [])) {
      folderMap[c.id] = c
    }
  }

  const allProjectTasks = (project.tasks || []).map((t) => {
    const f = t.folderId ? folderMap[t.folderId] : null
    return f ? { ...t, folderName: f.name, folderColor: f.color } : t
  })
  // When a parent folder is selected, also include tasks from its children
  const selectedFolderIds = selectedFolderId
    ? [selectedFolderId, ...(folders.find((f) => f.id === selectedFolderId)?.children ?? []).map((c) => c.id)]
    : null
  const allTasks = selectedFolderIds
    ? allProjectTasks.filter((t) => t.folderId && selectedFolderIds.includes(t.folderId))
    : allProjectTasks
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
      onTaskClick={openTaskDetail}
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
              <th className="py-3 px-4 font-medium hidden lg:table-cell">Cartella</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Assegnato</th>
              <th className="py-3 px-4 font-medium">Stato</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Priorità</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Scadenza</th>
            </tr>
          </thead>
          <tbody>
            {allTasks.map((task) => (
              <tr key={task.id} onClick={() => openTaskDetail(task.id)} className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors duration-200 even:bg-secondary/20">
                <td className="py-3 px-4 font-medium">{task.title}</td>
                <td className="py-3 px-4 text-muted hidden lg:table-cell">
                  {task.folderId && folderMap[task.folderId] ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: folderMap[task.folderId].color }} />
                      {folderMap[task.folderId].name}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 px-4 text-muted hidden md:table-cell">
                  {(task.assignments?.length ?? 0) > 0 ? (
                    <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
                  ) : task.assignee ? (
                    `${task.assignee.firstName} ${task.assignee.lastName}`
                  ) : '—'}
                </td>
                <td className="py-3 px-4">
                  <Badge status={task.status}>{TASK_STATUS_LABEL[task.status] || task.status}</Badge>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <Badge status={task.priority}>{PRIORITY_LABEL[task.priority] || task.priority}</Badge>
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
          onTaskClick={openTaskDetail}
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
        onClick={() => router.push(fromInternal ? '/internal' : '/projects')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {fromInternal ? 'Torna ai progetti interni' : 'Torna alla lista progetti'}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project.color && (
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
            )}
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{project.name}</h1>
            <Badge status={project.status}>{STATUS_LABEL[project.status] || project.status}</Badge>
            <Badge status={project.priority}>{PRIORITY_LABEL[project.priority] || project.priority}</Badge>
          </div>
          {project.client && (
            <p className="text-sm text-muted mt-1 truncate">{project.client.companyName} - {project.workspace.name}</p>
          )}
          {(project.members || []).length > 0 && (
            <div className="flex items-center gap-2 mt-1.5">
              <AvatarStack users={project.members.map((m) => m.user)} size="xs" max={5} />
              <span className="text-xs text-muted">{project.members.length} membri</span>
            </div>
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
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} className="touch-manipulation">
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Elimina</span>
          </Button>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm mx-4 border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Elimina progetto</h3>
            <p className="text-sm text-muted mb-4">
              Sei sicuro di voler eliminare <strong>{project.name}</strong>? Il progetto verrà archiviato e non sarà più visibile.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Annulla
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteProject} disabled={deleteSubmitting}>
                {deleteSubmitting ? 'Eliminazione...' : 'Elimina'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-primary" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Task Totali</p>
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
              <p className="text-xs text-muted font-medium">Completati</p>
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
              <p className="text-xs text-muted font-medium">Ore Stimate</p>
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
              <p className="text-xs text-muted font-medium">Ore Registrate</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{totalLogged}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectFolders
        projectId={projectId}
        folders={folders}
        onFoldersChange={fetchFolders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />

      <Tabs
        tabs={[
          { id: 'board', label: 'Board', content: boardTab },
          { id: 'list', label: 'Lista', content: listTab },
          { id: 'milestones', label: 'Timeline', content: milestonesTab },
          { id: 'time', label: 'Tempi', content: timeTab },
          { id: 'files', label: 'File', content: <ProjectAttachments projectId={projectId} folderId={selectedFolderId} /> },
          { id: 'links', label: 'Collegamenti', content: <ProjectLinks projectId={projectId} /> },
          { id: 'team', label: 'Team', content: (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted" />
                  <span className="text-sm font-medium">{(project.members || []).length} membri</span>
                </div>
                <div className="flex items-center gap-2">
                  {teamMembers.filter((u) => !(project.members || []).some((m) => m.userId === u.id)).length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const nonMembers = teamMembers.filter((u) => !(project.members || []).some((m) => m.userId === u.id))
                      setMemberUserIds(nonMembers.map((u) => u.id))
                      setAddMemberModalOpen(true)
                    }}>
                      <Users className="h-4 w-4 mr-2" />
                      Aggiungi Tutti
                    </Button>
                  )}
                  <Button size="sm" onClick={() => { setMemberUserIds([]); setAddMemberModalOpen(true) }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </div>
              </div>
              {(project.members || []).length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Nessun membro assegnato a questo progetto.</p>
              ) : (
                <div className="space-y-2">
                  {project.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${m.user.firstName} ${m.user.lastName}`} src={m.user.avatarUrl} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{m.user.firstName} {m.user.lastName}</p>
                          <p className="text-xs text-muted">{m.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.role === 'OWNER' ? 'default' : 'outline'}>
                          {m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : 'Membro'}
                        </Badge>
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removingMemberId === m.userId}
                          className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Rimuovi dal progetto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) },
          { id: 'chat', label: 'Chat', content: <ProjectChat projectId={projectId} folderId={selectedFolderId} /> },
        ]}
      />

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Nuovo Task" size="md">
        <form onSubmit={handleAddTask} className="space-y-4">
          {taskForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={taskForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}
          <Input label="Titolo *" required value={taskForm.values.title} onChange={(e) => taskForm.setValue('title', e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              rows={3}
              value={taskForm.values.description}
              onChange={(e) => taskForm.setValue('description', e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Select label="Priorità" options={PRIORITY_OPTIONS} value={taskForm.values.priority} onChange={(e) => taskForm.setValue('priority', e.target.value)} />
          <MultiUserSelect
            users={teamMembers}
            selected={taskAssigneeIds}
            onChange={setTaskAssigneeIds}
            label="Assegnatari"
            placeholder="Seleziona assegnatari..."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Scadenza" type="date" value={taskForm.values.dueDate} onChange={(e) => taskForm.setValue('dueDate', e.target.value)} />
            <Input label="Ore Stimate" type="number" step="0.5" value={taskForm.values.estimatedHours} onChange={(e) => taskForm.setValue('estimatedHours', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Crea Task</Button>
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
          <ColorSwatches
            value={editForm.color || '#3B82F6'}
            onChange={(color) => setEditForm((f) => ({ ...f, color }))}
          />
          {editError && (
            <p className="text-sm text-destructive">{editError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addMemberModalOpen} onClose={() => setAddMemberModalOpen(false)} title="Aggiungi Membri al Progetto" size="md">
        <div className="space-y-4">
          <MultiUserSelect
            users={teamMembers.filter((u) => !(project.members || []).some((m) => m.userId === u.id))}
            selected={memberUserIds}
            onChange={setMemberUserIds}
            label="Seleziona utenti"
            placeholder="Cerca utenti..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddMemberModalOpen(false)}>Annulla</Button>
            <Button onClick={handleAddMembers} disabled={addingMembers || memberUserIds.length === 0}>
              {addingMembers ? 'Salvataggio...' : `Aggiungi ${memberUserIds.length > 0 ? `(${memberUserIds.length})` : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

      <TaskDetailModal
        taskId={taskDetailId}
        open={taskDetailOpen}
        onClose={() => {
          setTaskDetailOpen(false)
          setTaskDetailId(null)
        }}
        onUpdated={fetchProject}
        userRole={userRole}
      />
    </div>
  )
}
