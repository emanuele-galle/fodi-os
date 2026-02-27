'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Plus, AlertCircle, List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { TaskFilters } from '@/components/crm/tasks/TaskFilters'
import { TaskCreateModal, TaskEditModal, TaskDeleteModal } from '@/components/crm/tasks/TaskModals'
import { TaskKanbanView } from '@/components/crm/tasks/TaskKanbanView'
import { TaskListView } from '@/components/crm/tasks/TaskListView'
import {
  type CrmTask, type StaffUser, type Client,
  emptyNewTask, emptyEditForm,
} from '@/components/crm/tasks/types'

export default function CrmTasksPage() {
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const limit = 20

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [newTask, setNewTask] = useState(emptyNewTask)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), crmOnly: 'true' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (clientFilter) params.set('clientId', clientFilter)
      const res = await fetch(`/api/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento delle attività')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle attività')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter, clientFilter])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { setPage(1) }, [search, statusFilter, priorityFilter, clientFilter])
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => {
      const users = (data.items || data.data || []).filter((u: StaffUser & { isActive?: boolean }) =>
        u.isActive !== false && ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM'].includes(u.role)
      )
      setStaffUsers(users)
    }).catch(() => {})
  }, [])
  useEffect(() => {
    fetch('/api/clients?limit=100').then(r => r.json()).then(data => {
      setClients(data.items || [])
    }).catch(() => {})
  }, [])

  const totalPages = Math.ceil(total / limit)

  const isOverdue = (task: CrmTask) => {
    if (task.status === 'DONE' || !task.dueDate) return false
    return new Date(task.dueDate) < new Date()
  }

  const overdueCount = tasks.filter(isOverdue).length

  const handleCreate = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        ...newTask,
        clientId: newTask.clientId || null,
        assigneeId: newTask.assigneeId || null,
        dueDate: newTask.dueDate || null,
      }
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setModalOpen(false)
        setNewTask(emptyNewTask)
        fetchTasks()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nella creazione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (task: CrmTask) => {
    setEditTaskId(task.id)
    setEditForm({
      title: task.title,
      description: task.description || '',
      clientId: task.clientId || '',
      assigneeId: task.assignee?.id || '',
      priority: task.priority,
      taskType: task.taskType || '',
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    })
    setFormError(null)
  }

  const handleEdit = async () => {
    if (!editTaskId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        ...editForm,
        clientId: editForm.clientId || null,
        assigneeId: editForm.assigneeId || null,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      }
      const res = await fetch(`/api/tasks/${editTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setEditTaskId(null)
        fetchTasks()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nel salvataggio')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'DONE' ? { completedAt: new Date().toISOString() } : {}),
        }),
      })
      if (res.ok) fetchTasks()
    } catch { /* Silent fail */ }
  }

  const handleComplete = async (taskId: string) => {
    await handleStatusChange(taskId, 'DONE')
  }

  const handleDelete = async () => {
    if (!deleteTaskId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/tasks/${deleteTaskId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteTaskId(null)
        fetchTasks()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nella cancellazione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Attività CRM</h1>
            <p className="text-xs md:text-sm text-muted mt-0.5">Gestione attività collegate ai clienti</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 bg-secondary/30 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>
          <Button onClick={() => { setModalOpen(true); setFormError(null) }} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuova Attività
          </Button>
        </div>
      </div>

      <TaskFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter}
        clientFilter={clientFilter} onClientFilterChange={setClientFilter}
        clients={clients} total={total}
      />

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm"><span className="font-semibold text-amber-600">{overdueCount}</span> attività scadute</p>
        </div>
      )}

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTasks()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nessuna attività trovata"
          description={search || statusFilter || priorityFilter || clientFilter ? 'Prova a modificare i filtri di ricerca.' : 'Nessuna attività CRM al momento. Crea la prima!'}
        />
      ) : viewMode === 'kanban' ? (
        <TaskKanbanView tasks={tasks} isOverdue={isOverdue} onStatusChange={handleStatusChange} />
      ) : (
        <TaskListView
          tasks={tasks}
          isOverdue={isOverdue}
          onComplete={handleComplete}
          onEdit={openEdit}
          onDelete={(id) => { setDeleteTaskId(id); setFormError(null) }}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      <TaskCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={newTask}
        onFormChange={setNewTask}
        clients={clients}
        staffUsers={staffUsers}
        onSubmit={handleCreate}
        submitting={submitting}
        formError={formError}
      />

      <TaskEditModal
        open={!!editTaskId}
        onClose={() => setEditTaskId(null)}
        form={editForm}
        onFormChange={setEditForm}
        clients={clients}
        staffUsers={staffUsers}
        onSubmit={handleEdit}
        submitting={submitting}
        formError={formError}
      />

      <TaskDeleteModal
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDelete}
        submitting={submitting}
        formError={formError}
      />
    </div>
  )
}
