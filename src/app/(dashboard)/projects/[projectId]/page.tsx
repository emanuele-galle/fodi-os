'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop -- page-level component with many sub-components and UI interaction handlers */

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, ChevronDown, Edit, Clock, CheckCircle2, Target, Timer, Video, Trash2, ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MultiUserSelect } from '@/components/ui/MultiUserSelect'
import { Skeleton } from '@/components/ui/Skeleton'
import { TASK_STATUS_LABELS, PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '@/lib/constants'
import { ProjectEditModal } from '@/components/projects/ProjectEditModal'
import { ProjectMembersPanel } from '@/components/projects/ProjectMembersPanel'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
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
  loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
})
const ProjectLinks = dynamic(() => import('@/components/projects/ProjectLinks').then(m => ({ default: m.ProjectLinks })), {
  loading: () => <Skeleton className="h-32 w-full rounded-lg" />,
})

interface ClientOption { id: string; companyName: string }
interface WorkspaceOption { id: string; name: string }
interface TaskUser { id: string; firstName: string; lastName: string; avatarUrl: string | null }

interface Task {
  id: string; title: string; status: string; priority: string; boardColumn: string
  folderId: string | null; folderName?: string | null; folderColor?: string | null
  dueDate: string | null; estimatedHours: number | null
  assignee?: TaskUser | null; assignments?: { id: string; role: string; user: TaskUser }[]
  _count?: { subtasks: number; comments: number }
}

interface Milestone { id: string; name: string; dueDate: string | null; status: string; tasks: Task[] }
interface TimeEntry { id: string; date: string; hours: number; description: string | null; billable: boolean; user: { firstName: string; lastName: string }; task?: { title: string } | null }
interface ProjectMember { id: string; userId: string; role: string; joinedAt: string; user: { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl: string | null } }

interface ProjectDetail {
  id: string; name: string; slug: string; description: string | null; status: string; priority: string
  startDate: string | null; endDate: string | null; budgetAmount: string | null; budgetHours: number | null; color: string
  client?: { id: string; companyName: string } | null; workspace: { id: string; name: string }
  tasks: Task[]; milestones: Milestone[]; members: ProjectMember[]; _count?: { tasks: number }
}

interface FolderNode {
  id: string; name: string; description: string | null; color: string; sortOrder: number
  parentId?: string | null; _count?: { tasks: number }; children?: FolderNode[]
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

const STATUS_LABEL = PROJECT_STATUS_LABELS
const TASK_STATUS_LABEL = TASK_STATUS_LABELS
const PRIORITY_LABEL = PRIORITY_LABELS

// Inline overlay components for unified DragOverlay (avoids eager-loading dynamic imports)
function TaskDragPreview({ task }: { task: Task }) {
  return (
    <div className="bg-card rounded-md border-2 border-primary p-3 shadow-lg w-72">
      <p className="font-medium text-sm mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <Badge status={task.priority} className="text-[10px]">{task.priority}</Badge>
        <div className="flex items-center gap-2">
          {(task.assignments?.length ?? 0) > 0 ? (
            <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
          ) : task.assignee ? (
            <span className="text-xs text-muted">{task.assignee.firstName} {task.assignee.lastName}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function FolderDragPreview({ folder }: { folder: { name: string; color: string } }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-primary/50 bg-card shadow-lg w-fit max-w-xs">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
      <span className="truncate">{folder.name}</span>
    </div>
  )
}

// Unified collision detection: folder drags use closestCenter, task drags use pointerWithin
const unifiedCollision: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type
  if (activeType === 'folder') return closestCenter(args)

  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

function TaskTreeRows({ tasks, depth, expandedIds, childrenMap, folderMap, onToggleExpand, onTaskClick }: {
  tasks: Task[]; depth: number; expandedIds: Set<string>; childrenMap: Record<string, Task[]>
  folderMap: Record<string, { id: string; name: string; color: string }>
  onToggleExpand: (id: string) => void; onTaskClick: (id: string) => void
}) {
  return (
    <>
      {tasks.map(task => (
        <TaskTreeRow
          key={task.id}
          task={task}
          depth={depth}
          expandedIds={expandedIds}
          childrenMap={childrenMap}
          folderMap={folderMap}
          onToggleExpand={onToggleExpand}
          onTaskClick={onTaskClick}
        />
      ))}
    </>
  )
}

function TaskTreeRow({ task, depth, expandedIds, childrenMap, folderMap, onToggleExpand, onTaskClick }: {
  task: Task; depth: number; expandedIds: Set<string>; childrenMap: Record<string, Task[]>
  folderMap: Record<string, { id: string; name: string; color: string }>
  onToggleExpand: (id: string) => void; onTaskClick: (id: string) => void
}) {
  const subtaskCount = task._count?.subtasks ?? 0
  const isExpanded = expandedIds.has(task.id)
  const children = childrenMap[task.id]
  const folder = task.folderId ? folderMap[task.folderId] : null
  const assigneeName = task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors duration-200 even:bg-secondary/20">
        <td className="py-3 px-4 font-medium" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-1.5">
            {subtaskCount > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleExpand(task.id) }}
                className="flex-shrink-0 text-muted hover:text-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <span onClick={() => onTaskClick(task.id)} className="truncate hover:text-primary transition-colors">
              {task.title}
            </span>
            {subtaskCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary flex-shrink-0">
                <ListChecks className="h-3 w-3" />
                {subtaskCount}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-muted hidden lg:table-cell" onClick={() => onTaskClick(task.id)}>
          {folder ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
              {folder.name}
            </span>
          ) : '—'}
        </td>
        <td className="py-3 px-4 text-muted hidden md:table-cell" onClick={() => onTaskClick(task.id)}>
          {(task.assignments?.length ?? 0) > 0 ? (
            <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
          ) : assigneeName ?? '—'}
        </td>
        <td className="py-3 px-4" onClick={() => onTaskClick(task.id)}>
          <Badge status={task.status}>{TASK_STATUS_LABEL[task.status] || task.status}</Badge>
        </td>
        <td className="py-3 px-4 hidden sm:table-cell" onClick={() => onTaskClick(task.id)}>
          <Badge status={task.priority}>{PRIORITY_LABEL[task.priority] || task.priority}</Badge>
        </td>
        <td className="py-3 px-4 text-muted hidden sm:table-cell" onClick={() => onTaskClick(task.id)}>
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('it-IT') : '—'}
        </td>
      </tr>
      {isExpanded && children && (
        <TaskTreeRows
          tasks={children}
          depth={depth + 1}
          expandedIds={expandedIds}
          childrenMap={childrenMap}
          folderMap={folderMap}
          onToggleExpand={onToggleExpand}
          onTaskClick={onTaskClick}
        />
      )}
    </>
  )
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
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
  const [clients, setClients] = useState<ClientOption[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; firstName: string; lastName: string; avatarUrl?: string | null }[]>([])
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedFolderInfo, setDraggedFolderInfo] = useState<{ name: string; color: string } | null>(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set())
  const [taskChildrenMap, setTaskChildrenMap] = useState<Record<string, Task[]>>({})

  const unifiedSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )

  const taskForm = useFormPersist(`new-task:${projectId}`, {
    title: '', description: '', priority: 'MEDIUM', dueDate: '', estimatedHours: '',
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
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.user) setUserRole(data.user.role) })
      .catch(() => {})
  }, [])

  useEffect(() => {
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

  useRealtimeRefresh('task', fetchProject)

  async function handleProjectMeet() {
    if (creatingMeet || !project) return
    setCreatingMeet(true)
    try {
      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: `Meet - ${project.name}` }),
      })
      if (res.ok) {
        const data = await res.json()
        window.open(data.meetLink, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setCreatingMeet(false)
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
    todo: 'TODO', in_progress: 'IN_PROGRESS', in_review: 'IN_REVIEW', done: 'DONE',
  }

  async function handleColumnChange(taskId: string, newColumn: string) {
    setProject((prev) => {
      if (!prev) return prev
      const tasks = prev.tasks.map((t) =>
        t.id === taskId ? { ...t, boardColumn: newColumn, status: COLUMN_STATUS_MAP[newColumn] || t.status } : t
      )
      return { ...prev, tasks }
    })
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardColumn: newColumn, status: COLUMN_STATUS_MAP[newColumn] || undefined }),
    })
  }

  async function handleTaskFolderChange(taskId: string, folderId: string | null) {
    setProject((prev) => {
      if (!prev) return prev
      const tasks = prev.tasks.map((t) => t.id === taskId ? { ...t, folderId } : t)
      return { ...prev, tasks }
    })
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    fetchFolders()
  }

  function handleUnifiedDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data?.type === 'task') {
      setDraggedTask(data.task as Task)
      setDraggedFolderInfo(null)
    } else if (data?.type === 'folder') {
      const item = data.item as { folder: { name: string; color: string } }
      setDraggedFolderInfo(item.folder)
      setDraggedTask(null)
    }
  }

  function handleUnifiedDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggedTask(null)
    setDraggedFolderInfo(null)

    if (!over) return

    const activeType = active.data.current?.type
    if (activeType !== 'task') return // folder drags handled by ProjectFolders via useDndMonitor

    const taskId = active.id as string
    const overData = over.data.current

    // Task dropped on a folder
    if (overData?.type === 'folder') {
      handleTaskFolderChange(taskId, over.id as string)
      return
    }

    // Task dropped on "all-folders" (remove from folder)
    if (overData?.type === 'all-folders') {
      handleTaskFolderChange(taskId, null)
      return
    }

    // Task dropped on a column or another task card
    let targetColumn: string | null = null
    if (overData?.type === 'column') {
      targetColumn = overData.columnKey as string
    } else if (overData?.type === 'task') {
      targetColumn = (overData.task as Task).boardColumn
    } else {
      const overId = String(over.id)
      if (overId.startsWith('column-')) {
        targetColumn = overId.replace('column-', '')
      }
    }

    if (!targetColumn) return
    const currentTask = active.data.current?.task as Task | undefined
    if (!currentTask || currentTask.boardColumn === targetColumn) return
    handleColumnChange(taskId, targetColumn)
  }

  function handleUnifiedDragCancel() {
    setDraggedTask(null)
    setDraggedFolderInfo(null)
  }

  async function fetchTaskChildren(taskId: string) {
    if (taskChildrenMap[taskId]) return
    const res = await fetch(`/api/tasks/${taskId}/subtasks`)
    if (res.ok) {
      const data = await res.json()
      if (data?.items) setTaskChildrenMap(prev => ({ ...prev, [taskId]: data.items }))
    }
  }

  function toggleTaskExpand(taskId: string) {
    setExpandedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
        fetchTaskChildren(taskId)
      }
      return next
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

  const folderMap: Record<string, { id: string; name: string; color: string }> = {}
  function walkFolders(list: typeof folders) {
    for (const f of list) {
      folderMap[f.id] = f
      if (f.children?.length) walkFolders(f.children)
    }
  }
  walkFolders(folders)

  const allProjectTasks = (project.tasks || []).map((t) => {
    const f = t.folderId ? folderMap[t.folderId] : null
    return f ? { ...t, folderName: f.name, folderColor: f.color } : t
  })
  function findFolderInTree(list: FolderNode[], id: string): FolderNode | null {
    for (const f of list) {
      if (f.id === id) return f
      const found = findFolderInTree(f.children ?? [], id)
      if (found) return found
    }
    return null
  }
  function collectDescendantIds(folder: FolderNode): string[] {
    const ids: string[] = []
    for (const c of folder.children ?? []) {
      ids.push(c.id)
      ids.push(...collectDescendantIds(c))
    }
    return ids
  }
  const selectedFolderIds = selectedFolderId
    ? (() => { const f = findFolderInTree(folders, selectedFolderId); return f ? [selectedFolderId, ...collectDescendantIds(f)] : [selectedFolderId] })()
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
    <KanbanBoard disableDndContext tasksByColumn={tasksByColumn} onColumnChange={handleColumnChange} onAddTask={openAddTask} onTaskClick={openTaskDetail} />
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
            <TaskTreeRows
              tasks={allTasks}
              depth={0}
              expandedIds={expandedTaskIds}
              childrenMap={taskChildrenMap}
              folderMap={folderMap}
              onToggleExpand={toggleTaskExpand}
              onTaskClick={openTaskDetail}
            />
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
        <GanttChart tasks={allTasks} milestones={project.milestones || []} onTaskClick={openTaskDetail} />
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
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
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
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="touch-manipulation">
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Modifica</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} className="touch-manipulation">
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Elimina</span>
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
          <div className="bg-card rounded-xl p-6 shadow-xl max-w-sm mx-4 border border-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Elimina progetto</h3>
            <p className="text-sm text-muted mb-4">
              Sei sicuro di voler eliminare <strong>{project.name}</strong>? Il progetto verrà archiviato e non sarà più visibile.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annulla</Button>
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

      <DndContext
        sensors={unifiedSensors}
        collisionDetection={unifiedCollision}
        onDragStart={handleUnifiedDragStart}
        onDragEnd={handleUnifiedDragEnd}
        onDragCancel={handleUnifiedDragCancel}
      >
        <ProjectFolders
          disableDndContext
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
            { id: 'links', label: 'Collegamenti', content: <ProjectLinks projectId={projectId} folderId={selectedFolderId} /> },
          { id: 'team', label: 'Team', content: (
            <ProjectMembersPanel
              projectId={projectId}
              members={project.members || []}
              teamMembers={teamMembers}
              onMembersChanged={fetchProject}
            />
          ) },
          { id: 'chat', label: 'Chat', content: <ProjectChat projectId={projectId} folderId={selectedFolderId} /> },
          ]}
        />

        <DragOverlay>
          {draggedTask && <TaskDragPreview task={draggedTask} />}
          {draggedFolderInfo && <FolderDragPreview folder={draggedFolderInfo} />}
        </DragOverlay>
      </DndContext>

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

      <ProjectEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        projectId={projectId}
        initialData={{ ...project, clientId: project.client?.id ?? null, workspaceId: project.workspace.id }}
        clients={clients}
        workspaces={workspaces}
        onSaved={fetchProject}
      />

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
