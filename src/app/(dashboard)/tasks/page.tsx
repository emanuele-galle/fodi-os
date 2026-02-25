'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckSquare,
  ListTodo,
  LayoutGrid,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  Timer,
  Users,
  Send,
  User,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Flame,
  Search,
  Download,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { getDueUrgency, URGENCY_STYLES, type DueUrgency } from '@/lib/task-utils'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { Tooltip } from '@/components/ui/Tooltip'
import { QuickTaskInput } from '@/components/tasks/QuickTaskInput'
import dynamic from 'next/dynamic'

const TaskDetailModal = dynamic(() => import('@/components/tasks/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })), {
  ssr: false,
})
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

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
  creator?: TaskUser | null
  assignments?: TaskAssignment[]
  project: { id: string; name: string } | null
  createdAt: string
  estimatedHours?: number | null
  timerStartedAt: string | null
  timerUserId: string | null
  _count?: { comments: number; subtasks: number }
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

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In Corso',
  IN_REVIEW: 'In Revisione',
  DONE: 'Completato',
  CANCELLED: 'Cancellato',
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
  { key: 'TODO', label: 'Da fare', color: 'border-gray-400', headerBg: 'bg-gray-500/10', headerText: 'text-gray-600 dark:text-gray-300' },
  { key: 'IN_PROGRESS', label: 'In Corso', color: 'border-blue-500', headerBg: 'bg-blue-500/10', headerText: 'text-blue-600 dark:text-blue-400' },
  { key: 'IN_REVIEW', label: 'In Revisione', color: 'border-amber-500', headerBg: 'bg-amber-500/10', headerText: 'text-amber-600 dark:text-amber-400' },
  { key: 'DONE', label: 'Completato', color: 'border-emerald-500', headerBg: 'bg-emerald-500/10', headerText: 'text-emerald-600 dark:text-emerald-400' },
]

const PRIORITY_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

type ViewMode = 'list' | 'kanban'
type TabKey = 'mine' | 'delegated' | 'team'

interface TabDef {
  key: TabKey
  label: string
  icon: typeof User
  adminOnly?: boolean
}

const TABS: TabDef[] = [
  { key: 'mine', label: 'Le Mie Task', icon: User },
  { key: 'delegated', label: 'Delegate', icon: Send },
  { key: 'team', label: 'Team', icon: Users, adminOnly: true },
]

function sortTasks(tasks: Task[]): Task[] {
  const now = new Date()
  return [...tasks].sort((a, b) => {
    // Overdue tasks first (only active ones)
    const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== 'DONE' && a.status !== 'CANCELLED'
    const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'DONE' && b.status !== 'CANCELLED'
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    // Then by priority (URGENT first)
    const aPrio = PRIORITY_ORDER[a.priority] || 0
    const bPrio = PRIORITY_ORDER[b.priority] || 0
    if (aPrio !== bPrio) return bPrio - aPrio

    // Then by closest due date
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1

    // Finally by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function TasksPage() {
  const { preferences, updatePreference, loaded: prefsLoaded } = useUserPreferences()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('mine')
  const [view, setView] = useState<ViewMode>('list')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({ mine: 0, delegated: 0, team: 0 })
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [subtasksCache, setSubtasksCache] = useState<Record<string, Task[]>>({})
  const [loadingSubtasks, setLoadingSubtasks] = useState<Set<string>>(new Set())
  const searchParams = useSearchParams()

  // Load user session for role check
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUserRole(data.user.role)
          setUserId(data.user.id)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch projects and users for filter dropdowns
  useEffect(() => {
    fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.items || []))
    fetch('/api/users').then(r => r.ok ? r.json() : null).then(d => {
      const list = d?.items || d?.users || (Array.isArray(d) ? d : [])
      setUsers(list)
    })
  }, [])

  // Open task from URL ?taskId=xxx&commentId=yyy (e.g. from notification links)
  const urlTaskId = useMemo(() => searchParams.get('taskId'), [searchParams])
  const urlCommentId = useMemo(() => searchParams.get('commentId'), [searchParams])
  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId)
      setModalOpen(true)
    }
  }, [urlTaskId])

  // Sync view preference
  useEffect(() => {
    if (prefsLoaded) setView(preferences.defaultView)
  }, [prefsLoaded, preferences.defaultView])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (projectFilter) params.set('projectId', projectFilter)
      if (assigneeFilter) params.set('assigneeId', assigneeFilter)
      if (sortBy) params.set('sort', sortBy)
      if (sortOrder) params.set('order', sortOrder)

      if (activeTab === 'mine') {
        params.set('mine', 'true')
        params.set('scope', 'assigned')
      } else if (activeTab === 'delegated') {
        params.set('mine', 'true')
        params.set('scope', 'delegated')
      }
      // 'team' tab: no mine filter = all tasks

      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.items || [])
      } else {
        setFetchError('Errore nel caricamento dei task')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei task')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, activeTab, searchQuery, projectFilter, assigneeFilter, sortBy, sortOrder])

  // Fetch tab counts (lightweight, no filters applied)
  const fetchTabCounts = useCallback(async () => {
    try {
      const [mineRes, delegatedRes, teamRes] = await Promise.all([
        fetch('/api/tasks?mine=true&scope=assigned&status=TODO,IN_PROGRESS,IN_REVIEW&limit=1'),
        fetch('/api/tasks?mine=true&scope=delegated&status=TODO,IN_PROGRESS,IN_REVIEW&limit=1'),
        fetch('/api/tasks?status=TODO,IN_PROGRESS,IN_REVIEW&limit=1'),
      ])
      const [mine, delegated, team] = await Promise.all([
        mineRes.ok ? mineRes.json() : { total: 0 },
        delegatedRes.ok ? delegatedRes.json() : { total: 0 },
        teamRes.ok ? teamRes.json() : { total: 0 },
      ])
      setTabCounts({
        mine: mine.total || 0,
        delegated: delegated.total || 0,
        team: team.total || 0,
      })
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    fetchTabCounts()
  }, [fetchTabCounts])

  function refreshAll() {
    fetchTasks()
    fetchTabCounts()
  }

  const toggleSubtasks = useCallback(async (taskId: string, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault() }
    if (expandedTasks.has(taskId)) {
      setExpandedTasks(prev => { const n = new Set(prev); n.delete(taskId); return n })
      return
    }
    // Fetch subtasks if not cached
    if (!subtasksCache[taskId]) {
      setLoadingSubtasks(prev => new Set(prev).add(taskId))
      try {
        const res = await fetch(`/api/tasks/${taskId}/subtasks`)
        if (res.ok) {
          const data = await res.json()
          setSubtasksCache(prev => ({ ...prev, [taskId]: data.items || [] }))
        }
      } catch { /* ignore */ } finally {
        setLoadingSubtasks(prev => { const n = new Set(prev); n.delete(taskId); return n })
      }
    }
    setExpandedTasks(prev => new Set(prev).add(taskId))
  }, [expandedTasks, subtasksCache])

  // Real-time refresh when task data changes via SSE
  useRealtimeRefresh('task', refreshAll)

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks])

  const activeTasks = useMemo(() => sortedTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED'), [sortedTasks])
  const completedTasks = useMemo(() => sortedTasks.filter(t => t.status === 'DONE' || t.status === 'CANCELLED'), [sortedTasks])

  const focusTasks = useMemo(() => {
    return activeTasks
      .filter(t => {
        const urgency = getDueUrgency(t.dueDate, t.status)
        return urgency === 'overdue' || urgency === 'today'
      })
      .slice(0, 5)
  }, [activeTasks])

  const [showCompleted, setShowCompleted] = useState(false)
  const [kanbanDoneCollapsed, setKanbanDoneCollapsed] = useState(true)

  const totalTasks = tasks.length
  const todoCount = tasks.filter((t) => t.status === 'TODO').length
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === 'DONE' || t.status === 'CANCELLED') return false
    return new Date(t.dueDate) < new Date()
  }).length
  const completedCount = tasks.filter((t) => t.status === 'DONE').length

  function openTask(id: string) {
    setSelectedTaskId(id)
    setModalOpen(true)
  }

  function exportCSV() {
    const rows: string[][] = [['Titolo', 'Stato', 'Priorità', 'Progetto', 'Assegnato a', 'Scadenza', 'Creato il']]
    for (const t of tasks) {
      rows.push([
        t.title,
        STATUS_LABELS[t.status] || t.status,
        PRIORITY_LABELS[t.priority] || t.priority,
        t.project?.name || '',
        t.assignments && t.assignments.length > 0
          ? t.assignments.map(a => `${a.user.firstName} ${a.user.lastName}`).join(', ')
          : t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '',
        t.dueDate ? new Date(t.dueDate).toLocaleDateString('it-IT') : '',
        new Date(t.createdAt).toLocaleDateString('it-IT'),
      ])
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { label: 'Totale', value: totalTasks, icon: Target, color: 'text-primary' },
    { label: 'In Corso', value: inProgressCount, icon: Clock, color: 'text-accent' },
    { label: 'Scaduti', value: overdueCount, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Completati', value: completedCount, icon: CheckCircle2, color: 'text-accent' },
  ]

  // Progress bar data
  const activeTotal = todoCount + inProgressCount + inReviewCount + completedCount
  const progressSegments = activeTotal > 0 ? [
    { key: 'DONE', count: completedCount, color: 'bg-emerald-500', label: 'Completati' },
    { key: 'IN_REVIEW', count: inReviewCount, color: 'bg-amber-500', label: 'In Revisione' },
    { key: 'IN_PROGRESS', count: inProgressCount, color: 'bg-blue-500', label: 'In Corso' },
    { key: 'TODO', count: todoCount, color: 'bg-gray-400', label: 'Da fare' },
  ] : []
  const completionPct = activeTotal > 0 ? Math.round((completedCount / activeTotal) * 100) : 0

  // Drag & drop status change (optimistic update + API call)
  async function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        fetchTasks()
      } else {
        fetchTabCounts()
      }
    } catch {
      fetchTasks()
    }
  }

  const canSeeTeam = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM'].includes(userRole)
  const visibleTabs = TABS.filter((t) => !t.adminOnly || canSeeTeam)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Task</h1>
            <p className="text-xs md:text-sm text-muted">Gestione attività e scadenze</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip content="Esporta CSV">
            <button
              onClick={exportCSV}
              disabled={tasks.length === 0}
              className="p-2.5 md:p-2 rounded-md border border-border text-muted hover:text-foreground hover:bg-secondary/60 transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
            </button>
          </Tooltip>
          <div className="flex rounded-md border border-border overflow-hidden">
            <Tooltip content="Vista lista">
              <button
                onClick={() => { setView('list'); updatePreference('defaultView', 'list') }}
                className={`p-2.5 md:p-2 transition-colors touch-manipulation ${view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                <ListTodo className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Vista kanban">
              <button
                onClick={() => { setView('kanban'); updatePreference('defaultView', 'kanban') }}
                className={`p-2.5 md:p-2 transition-colors touch-manipulation ${view === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 animate-stagger">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200">
            <CardContent className="flex items-center gap-3 py-3">
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

      {/* Mini progress bar */}
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

      {/* Focus del Giorno */}
      {focusTasks.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">Focus del Giorno</h3>
            <span className="text-xs bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-medium">
              {focusTasks.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {focusTasks.map(task => {
              const urgency = getDueUrgency(task.dueDate, task.status)
              const styles = URGENCY_STYLES[urgency]
              return (
                <div
                  key={task.id}
                  onClick={() => openTask(task.id)}
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
      )}

      {/* Tab bar */}
      <div className="flex bg-secondary/60 rounded-lg p-1 mb-4 overflow-x-auto scrollbar-none">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const count = tabCounts[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 md:py-1.5 text-sm font-medium transition-all rounded-lg whitespace-nowrap touch-manipulation min-h-[44px] md:min-h-0 flex-1',
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                  : 'text-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick task input */}
      <div className="mb-4">
        <QuickTaskInput onCreated={refreshAll} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <Select
          options={[{ value: '', label: 'Tutti i progetti' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          options={[{ value: '', label: 'Tutti gli assegnatari' }, ...users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]}
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          options={[
            { value: 'createdAt', label: 'Data creazione' },
            { value: 'priority', label: 'Priorità' },
            { value: 'dueDate', label: 'Scadenza' },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTasks()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nessun task trovato"
          description={
            statusFilter || priorityFilter || searchQuery || projectFilter || assigneeFilter
              ? 'Prova a modificare i filtri.'
              : activeTab === 'delegated'
                ? 'Non hai ancora delegato task ad altri.'
                : activeTab === 'team'
                  ? 'Nessun task attivo nel team.'
                  : 'Usa il campo sopra per creare il tuo primo task.'
          }
        />
      ) : view === 'list' ? (
        <>
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <>
              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {activeTasks.map((task) => (
                  <MobileTaskCard
                    key={task.id}
                    task={task}
                    activeTab={activeTab}
                    userId={userId}
                    onClick={() => openTask(task.id)}
                    expanded={expandedTasks.has(task.id)}
                    subtasks={subtasksCache[task.id]}
                    loadingSubtasks={loadingSubtasks.has(task.id)}
                    onToggleSubtasks={toggleSubtasks}
                    onSubtaskClick={openTask}
                  />
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block">
                <ListView tasks={activeTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
              </div>
            </>
          )}

          {/* Completed tasks - collapsible */}
          {completedTasks.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors mb-3"
              >
                {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Completate ({completedTasks.length})
              </button>
              {showCompleted && (
                <div className="opacity-60">
                  <div className="md:hidden space-y-3">
                    {completedTasks.map((task) => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        activeTab={activeTab}
                        userId={userId}
                        onClick={() => openTask(task.id)}
                        expanded={expandedTasks.has(task.id)}
                        subtasks={subtasksCache[task.id]}
                        loadingSubtasks={loadingSubtasks.has(task.id)}
                        onToggleSubtasks={toggleSubtasks}
                        onSubtaskClick={openTask}
                      />
                    ))}
                  </div>
                  <div className="hidden md:block">
                    <ListView tasks={completedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <KanbanView tasks={sortedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} onStatusChange={handleStatusChange} kanbanDoneCollapsed={kanbanDoneCollapsed} onToggleDoneCollapsed={() => setKanbanDoneCollapsed(!kanbanDoneCollapsed)} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
      )}

      <TaskDetailModal
        taskId={selectedTaskId}
        highlightCommentId={urlCommentId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedTaskId(null)
        }}
        onUpdated={refreshAll}
        userRole={userRole}
      />
    </div>
  )
}

function TaskBadges({ task, activeTab, userId }: { task: Task; activeTab: TabKey; userId: string }) {
  const isCreator = task.creator?.id === userId
  const isAssignee = task.assignee?.id === userId || task.assignments?.some((a) => a.user.id === userId)

  return (
    <>
      {activeTab === 'team' && isCreator && (
        <Badge variant="info" className="text-[10px] px-1.5 py-0">Creata da te</Badge>
      )}
      {activeTab === 'team' && isAssignee && !isCreator && (
        <Badge variant="success" className="text-[10px] px-1.5 py-0">Assegnata a te</Badge>
      )}
      {(activeTab === 'delegated' || activeTab === 'team') && task._count && task._count.comments > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <MessageSquare className="h-3 w-3" />
          {task._count.comments}
        </span>
      )}
      {task.estimatedHours && task.estimatedHours > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <Clock className="h-3 w-3" />
          {task.estimatedHours}h
        </span>
      )}
      {task._count && task._count.subtasks > 0 && (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted">
          <ListTodo className="h-3 w-3" />
          {task._count.subtasks}
        </span>
      )}
    </>
  )
}

function UrgencyBadge({ urgency }: { urgency: DueUrgency }) {
  const styles = URGENCY_STYLES[urgency]
  if (!styles.label) return null
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', styles.badgeBg)}>
      {styles.label}
    </span>
  )
}

function MobileTaskCard({ task, activeTab, userId, onClick, expanded, subtasks, loadingSubtasks, onToggleSubtasks, onSubtaskClick }: { task: Task; activeTab: TabKey; userId: string; onClick: () => void; expanded?: boolean; subtasks?: Task[]; loadingSubtasks?: boolean; onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void; onSubtaskClick?: (id: string) => void }) {
  const urgency = getDueUrgency(task.dueDate, task.status)
  const urgencyStyles = URGENCY_STYLES[urgency]

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation shadow-[var(--shadow-sm)] rounded-lg border bg-card',
        urgency === 'overdue' || urgency === 'today' ? `${urgencyStyles.border} ${urgencyStyles.bg}` : 'border-border/80'
      )}
      style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task._count && task._count.subtasks > 0 && onToggleSubtasks && (
            <button
              onClick={(e) => onToggleSubtasks(task.id, e)}
              className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
            </button>
          )}
          {task.timerStartedAt && (
            <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
          )}
          <span className="font-medium text-sm line-clamp-2">{task.title}</span>
        </div>
        <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge status={task.status}>
          {STATUS_LABELS[task.status] || task.status}
        </Badge>
        <UrgencyBadge urgency={urgency} />
        <TaskBadges task={task} activeTab={activeTab} userId={userId} />
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
          <span className={cn('text-xs', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
            {new Date(task.dueDate).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
      {/* Subtasks nested */}
      {expanded && (
        <div className="ml-3 pl-3 border-l-2 border-primary/20 space-y-2 pt-1">
          {loadingSubtasks ? (
            <div className="flex items-center gap-2 py-2">
              <div className="h-3 w-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-xs text-muted">Caricamento subtask...</span>
            </div>
          ) : subtasks && subtasks.length > 0 ? (
            subtasks.map((sub) => {
              const subUrgency = getDueUrgency(sub.dueDate, sub.status)
              return (
                <div
                  key={sub.id}
                  onClick={(e) => { e.stopPropagation(); onSubtaskClick?.(sub.id) }}
                  className={cn(
                    'p-2.5 rounded-md border bg-secondary/30 cursor-pointer hover:bg-secondary/60 transition-colors',
                    'border-border/50'
                  )}
                  style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{sub.title}</span>
                    <Badge status={sub.status} className="text-[9px] px-1 py-0">
                      {STATUS_LABELS[sub.status] || sub.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {sub.assignee && (
                      <div className="flex items-center gap-1">
                        <Avatar name={`${sub.assignee.firstName} ${sub.assignee.lastName}`} src={sub.assignee.avatarUrl} size="xs" />
                        <span className="text-[10px] text-muted">{sub.assignee.firstName}</span>
                      </div>
                    )}
                    {sub.dueDate && (
                      <span className={cn('text-[10px]', URGENCY_STYLES[subUrgency].text)}>
                        {new Date(sub.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <span className="text-xs text-muted py-1">Nessuna subtask</span>
          )}
        </div>
      )}
    </div>
  )
}

function ListView({ tasks, activeTab, userId, onTaskClick, expandedTasks, subtasksCache, loadingSubtasks, onToggleSubtasks }: { tasks: Task[]; activeTab: TabKey; userId: string; onTaskClick: (id: string) => void; expandedTasks?: Set<string>; subtasksCache?: Record<string, Task[]>; loadingSubtasks?: Set<string>; onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void }) {
  return (
    <div className="rounded-xl border border-border/20 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Titolo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Stato</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Priorita</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Assegnato</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Progetto</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const urgency = getDueUrgency(task.dueDate, task.status)
            const urgencyStyles = URGENCY_STYLES[urgency]
            const hasSubtasks = task._count && task._count.subtasks > 0
            const isExpanded = expandedTasks?.has(task.id)
            const subs = subtasksCache?.[task.id]
            const isLoadingSubs = loadingSubtasks?.has(task.id)
            return (
              <React.Fragment key={task.id}>
              <tr
                onClick={() => onTaskClick(task.id)}
                className={cn(
                  'border-b border-border/10 hover:bg-secondary/8 cursor-pointer transition-colors group even:bg-secondary/[0.03]',
                  (urgency === 'overdue' || urgency === 'today') && `${urgencyStyles.bg}`,
                  isExpanded && 'border-b-0'
                )}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasSubtasks && onToggleSubtasks ? (
                      <button
                        onClick={(e) => onToggleSubtasks(task.id, e)}
                        className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}
                    {task.timerStartedAt && (
                      <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{task.title}</span>
                    <UrgencyBadge urgency={urgency} />
                    <TaskBadges task={task} activeTab={activeTab} userId={userId} />
                  </div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <Badge status={task.status}>
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
                    {PRIORITY_LABELS[task.priority] || task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
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
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  {task.dueDate ? (
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
                        {new Date(task.dueDate).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <span className="text-sm text-muted">
                    {task.project ? task.project.name : 'Personale'}
                  </span>
                </td>
              </tr>
              {/* Subtask rows */}
              {isExpanded && (
                <tr className="border-b border-border/10">
                  <td colSpan={6} className="px-4 py-0 pb-3">
                    <div className="ml-6 pl-3 border-l-2 border-primary/20 space-y-1 pt-1">
                      {isLoadingSubs ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-3 w-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                          <span className="text-xs text-muted">Caricamento subtask...</span>
                        </div>
                      ) : subs && subs.length > 0 ? (
                        subs.map((sub) => {
                          const subUrgency = getDueUrgency(sub.dueDate, sub.status)
                          const subUrgencyStyles = URGENCY_STYLES[subUrgency]
                          return (
                            <div
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); onTaskClick(sub.id) }}
                              className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors group/sub"
                              style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
                            >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <ListTodo className="h-3 w-3 text-muted flex-shrink-0" />
                                <span className="text-xs font-medium truncate">{sub.title}</span>
                              </div>
                              <Badge status={sub.status} className="text-[9px] px-1.5 py-0 flex-shrink-0">
                                {STATUS_LABELS[sub.status] || sub.status}
                              </Badge>
                              <Badge status={sub.priority} className="text-[9px] px-1.5 py-0 flex-shrink-0 hidden md:inline-flex">
                                {PRIORITY_LABELS[sub.priority] || sub.priority}
                              </Badge>
                              {sub.assignee && (
                                <div className="flex items-center gap-1 flex-shrink-0 hidden lg:flex">
                                  <Avatar name={`${sub.assignee.firstName} ${sub.assignee.lastName}`} src={sub.assignee.avatarUrl} size="xs" />
                                  <span className="text-[10px] text-muted">{sub.assignee.firstName}</span>
                                </div>
                              )}
                              {sub.dueDate && (
                                <span className={cn('text-[10px] flex-shrink-0 hidden lg:inline', subUrgencyStyles.text)}>
                                  {new Date(sub.dueDate).toLocaleDateString('it-IT')}
                                </span>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-xs text-muted py-1 block">Nessuna subtask</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Collision detection: prefer column droppables over task cards
const kanbanCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  const columnHit = pointerCollisions.find((c) => String(c.id).startsWith('col-'))
  if (columnHit) return [columnHit]
  if (pointerCollisions.length > 0) return pointerCollisions
  const rectCollisions = rectIntersection(args)
  const rectColumnHit = rectCollisions.find((c) => String(c.id).startsWith('col-'))
  if (rectColumnHit) return [rectColumnHit]
  return rectCollisions
}

function DroppableKanbanColumn({ columnKey, isOver, children }: { columnKey: string; isOver?: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver: over } = useDroppable({
    id: `col-${columnKey}`,
    data: { type: 'column', columnKey },
  })
  const active = isOver ?? over

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] md:min-w-0 rounded-lg transition-colors',
        active && 'ring-2 ring-primary/20 bg-primary/5'
      )}
    >
      {children}
    </div>
  )
}

function DraggableTaskCard({ task, activeTab, userId, onClick, expanded, subtasks, loadingSubtasks, onToggleSubtasks, onSubtaskClick }: { task: Task; activeTab: TabKey; userId: string; onClick: () => void; expanded?: boolean; subtasks?: Task[]; loadingSubtasks?: boolean; onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void; onSubtaskClick?: (id: string) => void }) {
  const urgency = getDueUrgency(task.dueDate, task.status)
  const urgencyStyles = URGENCY_STYLES[urgency]
  const hasSubtasks = task._count && task._count.subtasks > 0
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={{ ...style, touchAction: 'none' }} {...attributes} {...listeners}>
    <Card
      style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
      className={cn('!p-3 cursor-grab active:cursor-grabbing', (urgency === 'overdue' || urgency === 'today') && `${urgencyStyles.border} ${urgencyStyles.bg}`)}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick() } }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {hasSubtasks && onToggleSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSubtasks(task.id, e) }}
            className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
          </button>
        )}
        {task.timerStartedAt && (
          <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
        )}
        <p className="text-sm font-medium line-clamp-2">{task.title}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        <UrgencyBadge urgency={urgency} />
        <TaskBadges task={task} activeTab={activeTab} userId={userId} />
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
          <span className={cn('text-xs', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
            {new Date(task.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
      {/* Subtasks nested inside kanban card */}
      {expanded && (
        <div className="mt-2 pl-2 border-l-2 border-primary/20 space-y-1">
          {loadingSubtasks ? (
            <div className="flex items-center gap-1.5 py-1">
              <div className="h-2.5 w-2.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] text-muted">Caricamento...</span>
            </div>
          ) : subtasks && subtasks.length > 0 ? (
            subtasks.map((sub) => (
              <div
                key={sub.id}
                onClick={(e) => { e.stopPropagation(); onSubtaskClick?.(sub.id) }}
                className="flex items-center gap-1.5 py-1 px-2 rounded bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
              >
                <span className={cn('text-[10px] font-medium truncate flex-1', sub.status === 'DONE' && 'line-through text-muted')}>{sub.title}</span>
                <Badge status={sub.status} className="text-[8px] px-1 py-0">
                  {STATUS_LABELS[sub.status]?.[0] || sub.status[0]}
                </Badge>
              </div>
            ))
          ) : (
            <span className="text-[10px] text-muted">Nessuna subtask</span>
          )}
        </div>
      )}
    </Card>
    </div>
  )
}

function KanbanView({ tasks, activeTab, userId, onTaskClick, onStatusChange, kanbanDoneCollapsed, onToggleDoneCollapsed, expandedTasks, subtasksCache, loadingSubtasks, onToggleSubtasks }: { tasks: Task[]; activeTab: TabKey; userId: string; onTaskClick: (id: string) => void; onStatusChange?: (taskId: string, newStatus: string) => void; kanbanDoneCollapsed?: boolean; onToggleDoneCollapsed?: () => void; expandedTasks?: Set<string>; subtasksCache?: Record<string, Task[]>; loadingSubtasks?: Set<string>; onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !onStatusChange) return

    const taskId = active.id as string
    const overData = over.data.current

    let targetStatus: string | null = null
    if (overData?.type === 'column') {
      targetStatus = overData.columnKey as string
    } else if (overData?.type === 'task') {
      targetStatus = (overData.task as Task).status
    } else {
      const overId = String(over.id)
      if (overId.startsWith('col-')) targetStatus = overId.replace('col-', '')
    }

    if (!targetStatus) return
    const currentTask = active.data.current?.task as Task | undefined
    if (!currentTask || currentTask.status === targetStatus) return

    onStatusChange(taskId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-mobile-scroll md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)
          const isDoneCol = col.key === 'DONE'
          const isCollapsed = isDoneCol && kanbanDoneCollapsed

          return (
            <DroppableKanbanColumn key={col.key} columnKey={col.key}>
              <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg border-b-2 ${col.color} ${col.headerBg}`}>
                <h3 className={`text-sm font-bold ${col.headerText}`}>{col.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${col.headerText} bg-white/60 dark:bg-white/10 rounded-full px-2 py-0.5`}>
                    {columnTasks.length}
                  </span>
                  {isDoneCol && columnTasks.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleDoneCollapsed?.() }}
                      className={`p-0.5 rounded ${col.headerText} hover:bg-white/20 transition-colors`}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
              {isCollapsed ? (
                <div className="min-h-[60px] flex items-center justify-center">
                  <button
                    onClick={() => onToggleDoneCollapsed?.()}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Mostra {columnTasks.length} task
                  </button>
                </div>
              ) : (
                <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={cn('space-y-2 flex-1 min-h-[60px]', isDoneCol && 'opacity-60')}>
                    {columnTasks.map((task) => (
                      <DraggableTaskCard key={task.id} task={task} activeTab={activeTab} userId={userId} onClick={() => onTaskClick(task.id)} expanded={expandedTasks?.has(task.id)} subtasks={subtasksCache?.[task.id]} loadingSubtasks={loadingSubtasks?.has(task.id)} onToggleSubtasks={onToggleSubtasks} onSubtaskClick={onTaskClick} />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-6 text-sm text-muted">
                        Nessun task
                      </div>
                    )}
                  </div>
                </SortableContext>
              )}
            </DroppableKanbanColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <Card
            className="!p-3 shadow-lg border-2 border-primary w-72"
            style={{ borderLeft: `3px solid ${PRIORITY_COLORS[activeTask.priority] || 'var(--color-primary)'}` }}
          >
            <p className="text-sm font-medium line-clamp-2 mb-2">{activeTask.title}</p>
            <div className="flex items-center gap-1.5">
              <Badge status={activeTask.priority} pulse={activeTask.priority === 'URGENT'}>
                {PRIORITY_LABELS[activeTask.priority]}
              </Badge>
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}
