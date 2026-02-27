'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckSquare, ListTodo, LayoutGrid, ChevronDown, ChevronRight, Download, AlertTriangle, User, Send, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDueUrgency } from '@/lib/task-utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tooltip } from '@/components/ui/Tooltip'
import { QuickTaskInput } from '@/components/tasks/QuickTaskInput'
import { TaskStats } from '@/components/tasks/TaskStats'
import { TaskFocusPanel } from '@/components/tasks/TaskFocusPanel'
import { TaskTabBar, TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskListView } from '@/components/tasks/TaskListView'
import { MobileTaskCard } from '@/components/tasks/MobileTaskCard'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { sortTasks, STATUS_LABELS, PRIORITY_LABELS, type Task, type TabKey, type ViewMode, type TabDef } from '@/components/tasks/types'
import dynamic from 'next/dynamic'

const TaskDetailModal = dynamic(() => import('@/components/tasks/TaskDetailModal').then(m => ({ default: m.TaskDetailModal })), {
  ssr: false,
})
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

const TABS: TabDef[] = [
  { key: 'mine', label: 'Le Mie Task', icon: User },
  { key: 'delegated', label: 'Delegate', icon: Send },
  { key: 'team', label: 'Team', icon: Users, adminOnly: true },
]

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

  useEffect(() => {
    fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.items || []))
    fetch('/api/users').then(r => r.ok ? r.json() : null).then(d => {
      const list = d?.items || d?.users || (Array.isArray(d) ? d : [])
      setUsers(list)
    })
  }, [])

  const urlTaskId = useMemo(() => searchParams.get('taskId'), [searchParams])
  const urlCommentId = useMemo(() => searchParams.get('commentId'), [searchParams])
  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId)
      setModalOpen(true)
    }
  }, [urlTaskId])

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

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { fetchTabCounts() }, [fetchTabCounts])

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

  async function handleStatusChange(taskId: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
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

      <TaskStats tasks={tasks} />
      <TaskFocusPanel tasks={focusTasks} onTaskClick={openTask} />

      <TaskTabBar tabs={visibleTabs} activeTab={activeTab} onTabChange={setActiveTab} tabCounts={tabCounts} />

      <div className="mb-4">
        <QuickTaskInput onCreated={refreshAll} />
      </div>

      <TaskFilters
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter} onPriorityChange={setPriorityFilter}
        projectFilter={projectFilter} onProjectChange={setProjectFilter}
        assigneeFilter={assigneeFilter} onAssigneeChange={setAssigneeFilter}
        sortBy={sortBy} onSortChange={setSortBy}
        projects={projects} users={users}
      />

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTasks()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

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
          {activeTasks.length > 0 && (
            <>
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
              <div className="hidden md:block">
                <TaskListView tasks={activeTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
              </div>
            </>
          )}

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
                    <TaskListView tasks={completedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <TaskKanbanView tasks={sortedTasks} activeTab={activeTab} userId={userId} onTaskClick={openTask} onStatusChange={handleStatusChange} kanbanDoneCollapsed={kanbanDoneCollapsed} onToggleDoneCollapsed={() => setKanbanDoneCollapsed(!kanbanDoneCollapsed)} expandedTasks={expandedTasks} subtasksCache={subtasksCache} loadingSubtasks={loadingSubtasks} onToggleSubtasks={toggleSubtasks} />
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
