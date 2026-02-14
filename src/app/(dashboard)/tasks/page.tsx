'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'
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
  _count?: { comments: number }
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
  const [activeTab, setActiveTab] = useState<TabKey>('mine')
  const [view, setView] = useState<ViewMode>('list')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [tabCounts, setTabCounts] = useState<Record<TabKey, number>>({ mine: 0, delegated: 0, team: 0 })
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
  }, [statusFilter, priorityFilter, activeTab])

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

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks])

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
    { key: 'IN_PROGRESS', count: inProgressCount, color: 'bg-indigo-500', label: 'In Corso' },
    { key: 'TODO', count: todoCount, color: 'bg-gray-400', label: 'Da fare' },
  ] : []
  const completionPct = activeTotal > 0 ? Math.round((completedCount / activeTotal) * 100) : 0

  const canSeeTeam = ['ADMIN', 'MANAGER'].includes(userRole)
  const visibleTabs = TABS.filter((t) => !t.adminOnly || canSeeTeam)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 text-primary p-2 md:p-2.5 rounded-lg flex-shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Task</h1>
            <p className="text-xs md:text-sm text-muted">Gestione attività e scadenze</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
            statusFilter || priorityFilter
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
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {sortedTasks.map((task) => (
              <MobileTaskCard
                key={task.id}
                task={task}
                activeTab={activeTab}
                userId={userId}
                onClick={() => openTask(task.id)}
              />
            ))}
          </div>
          {/* Desktop table view */}
          <div className="hidden md:block">
            <ListView tasks={sortedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} />
          </div>
        </>
      ) : (
        <KanbanView tasks={sortedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} />
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
    </>
  )
}

function MobileTaskCard({ task, activeTab, userId, onClick }: { task: Task; activeTab: TabKey; userId: string; onClick: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED'

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation shadow-[var(--shadow-sm)] rounded-lg border bg-card',
        isOverdue ? 'border-destructive/40 bg-red-500/5' : 'border-border/80'
      )}
      style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.timerStartedAt && (
            <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
          )}
          <span className="font-medium text-sm line-clamp-2">{task.title}</span>
        </div>
        <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} pulse={task.priority === 'URGENT'}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </Badge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={STATUS_BADGE[task.status] || 'default'}>
          {STATUS_LABELS[task.status] || task.status}
        </Badge>
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
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {isOverdue && '⚠ '}
            {new Date(task.dueDate).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  )
}

function ListView({ tasks, activeTab, userId, onTaskClick }: { tasks: Task[]; activeTab: TabKey; userId: string; onTaskClick: (id: string) => void }) {
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
          {tasks.map((task) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED'
            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={cn(
                  'border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors even:bg-secondary/20',
                  isOverdue && 'bg-red-500/5 hover:bg-red-500/10'
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.timerStartedAt && (
                      <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{task.title}</span>
                    <TaskBadges task={task} activeTab={activeTab} userId={userId} />
                  </div>
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
                    <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-muted'}`}>
                      {isOverdue && '⚠ '}
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KanbanView({ tasks, activeTab, userId, onTaskClick }: { tasks: Task[]; activeTab: TabKey; userId: string; onTaskClick: (id: string) => void }) {
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
              {columnTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED'
                return (
                  <Card
                    key={task.id}
                    className={cn('!p-3 cursor-pointer', isOverdue && 'border-destructive/40 bg-red-500/5')}
                    onClick={() => onTaskClick(task.id)}
                    style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      {task.timerStartedAt && (
                        <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} pulse={task.priority === 'URGENT'}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
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
                        <span
                          className={`text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted'}`}
                        >
                          {isOverdue && '⚠ '}
                          {new Date(task.dueDate).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })}
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
