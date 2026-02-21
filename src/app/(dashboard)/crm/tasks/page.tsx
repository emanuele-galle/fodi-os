'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Search, Plus, Edit, Trash2, CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Clock, User, Building2, List, LayoutGrid, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { PRIORITY_BADGE } from '@/lib/crm-constants'
import Link from 'next/link'

interface StaffUser {
  id: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
}

interface Client {
  id: string
  companyName: string
}

interface CrmTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  taskType: string | null
  dueDate: string | null
  completedAt: string | null
  clientId: string | null
  client: { id: string; companyName: string } | null
  assignee: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
  creator: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

const TASK_TYPE_OPTIONS = [
  { value: '', label: 'Seleziona tipo' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CALL', label: 'Chiamata' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Riunione' },
  { value: 'PROPOSAL', label: 'Preventivo' },
  { value: 'OTHER', label: 'Altro' },
]

const TASK_STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In corso' },
  { value: 'IN_REVIEW', label: 'In revisione' },
  { value: 'DONE', label: 'Completato' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completato',
}

const TYPE_LABELS: Record<string, string> = {
  FOLLOW_UP: 'Follow-up',
  CALL: 'Chiamata',
  EMAIL: 'Email',
  MEETING: 'Riunione',
  PROPOSAL: 'Preventivo',
  OTHER: 'Altro',
}

const KANBAN_COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE'] as const

const NEXT_STATUS: Record<string, string> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
}

const emptyNewTask = {
  title: '',
  description: '',
  clientId: '',
  assigneeId: '',
  priority: 'MEDIUM',
  taskType: 'FOLLOW_UP',
  dueDate: '',
}

const emptyEditForm = {
  title: '',
  description: '',
  clientId: '',
  assigneeId: '',
  priority: '',
  taskType: '',
  status: '',
  dueDate: '',
}

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

  // Create task
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

  // Edit task
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
        dueDate: editForm.dueDate || null,
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

  // Update task status (for kanban)
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
      if (res.ok) {
        fetchTasks()
      }
    } catch {
      // Silent fail
    }
  }

  // Complete task
  const handleComplete = async (taskId: string) => {
    await handleStatusChange(taskId, 'DONE')
  }

  // Delete task
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
          {/* View toggle */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per titolo, descrizione, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            options={TASK_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-44"
          />
          <Select
            options={PRIORITY_OPTIONS}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-44"
          />
          <Select
            options={[
              { value: '', label: 'Tutti i clienti' },
              ...clients.map(c => ({ value: c.id, label: c.companyName }))
            ]}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-48"
          />
          <span className="text-sm text-muted whitespace-nowrap">{total} totali</span>
        </div>
      </div>

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
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLUMNS.map(status => {
            const statusTasks = tasks.filter(t => t.status === status)
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
                  <Badge variant="outline" className="text-xs">{statusTasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-secondary/20 p-2">
                  {statusTasks.map(task => (
                    <div key={task.id} className="bg-card border border-border/40 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        {NEXT_STATUS[status] && (
                          <button
                            onClick={() => handleStatusChange(task.id, NEXT_STATUS[status])}
                            className="flex-shrink-0 p-1 rounded hover:bg-secondary/50 text-muted hover:text-foreground transition-colors"
                            title={`Sposta a ${STATUS_LABELS[NEXT_STATUS[status]]}`}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {task.client && (
                        <Link href={`/crm/${task.clientId}`} className="text-xs text-primary hover:underline block">
                          {task.client.companyName}
                        </Link>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-xs">
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                        {task.dueDate && (
                          <span className={`text-[11px] ${isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}`}>
                            {new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} src={task.assignee.avatarUrl} size="xs" />
                          <span className="text-[11px] text-muted">{task.assignee.firstName} {task.assignee.lastName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {statusTasks.length === 0 && (
                    <p className="text-xs text-muted text-center py-8">Nessuna attività</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border/40 bg-card p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{task.title}</p>
                    {task.taskType && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {TYPE_LABELS[task.taskType] || task.taskType}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge status={task.status}>{STATUS_LABELS[task.status] || task.status}</Badge>
                    <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-xs">
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </Badge>
                  </div>
                </div>
                {task.description && (
                  <p className="text-xs text-muted line-clamp-2">{task.description}</p>
                )}
                {task.client && (
                  <Link href={`/crm/${task.clientId}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Building2 className="h-3 w-3" />
                    {task.client.companyName}
                  </Link>
                )}
                {task.assignee && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <User className="h-3 w-3" />
                    {task.assignee.firstName} {task.assignee.lastName}
                  </div>
                )}
                {task.dueDate && (
                  <div className={`flex items-center gap-1.5 text-xs ${isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}`}>
                    <Clock className="h-3 w-3" />
                    {new Date(task.dueDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    {isOverdue(task) && ' (Scaduta)'}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted">{new Date(task.createdAt).toLocaleDateString('it-IT')}</span>
                  <div className="flex items-center gap-1.5">
                    {task.status !== 'DONE' && (
                      <Button variant="ghost" size="sm" onClick={() => handleComplete(task.id)} className="h-8 w-8 p-0 text-emerald-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(task)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setDeleteTaskId(task.id); setFormError(null) }} className="h-8 w-8 p-0 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Titolo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden xl:table-cell">Assegnato a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Priorità</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted/80 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.taskType && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {TYPE_LABELS[task.taskType] || task.taskType}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {task.client ? (
                        <Link
                          href={`/crm/${task.clientId}`}
                          className="text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {task.client.companyName}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} src={task.assignee.avatarUrl} size="xs" />
                          <span className="text-sm text-muted">{task.assignee.firstName} {task.assignee.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_BADGE[task.priority] || 'default'}>
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={task.status}>{STATUS_LABELS[task.status] || task.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {task.dueDate ? (
                        <span className={isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}>
                          {new Date(task.dueDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.status !== 'DONE' && (
                          <Button variant="ghost" size="sm" onClick={() => handleComplete(task.id)} className="h-8 w-8 p-0 text-emerald-600" title="Completa">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(task)} className="h-8 w-8 p-0" title="Modifica">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTaskId(task.id); setFormError(null) }} className="h-8 w-8 p-0 text-destructive" title="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} attività totali</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Task Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Attività CRM" size="lg">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Titolo *" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Descrizione breve attività" />
            </div>
            <Select
              label="Cliente *"
              options={[
                { value: '', label: 'Seleziona cliente' },
                ...clients.map(c => ({ value: c.id, label: c.companyName }))
              ]}
              value={newTask.clientId}
              onChange={(e) => setNewTask({ ...newTask, clientId: e.target.value })}
            />
            <Select
              label="Assegnato a"
              options={[
                { value: '', label: 'Non assegnato' },
                ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
              ]}
              value={newTask.assigneeId}
              onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
            />
            <Select
              label="Tipo Attività"
              options={TASK_TYPE_OPTIONS.filter(o => o.value !== '')}
              value={newTask.taskType}
              onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
            />
            <Select
              label="Priorità"
              options={PRIORITY_OPTIONS.filter(o => o.value !== '')}
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Scadenza"
                type="datetime-local"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Descrizione</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Dettagli attività..."
              rows={3}
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={submitting || !newTask.title || !newTask.clientId}>
              {submitting ? 'Salvataggio...' : 'Crea Attività'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={!!editTaskId} onClose={() => setEditTaskId(null)} title="Modifica Attività" size="lg">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Titolo" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <Select
              label="Cliente"
              options={[
                { value: '', label: 'Nessun cliente' },
                ...clients.map(c => ({ value: c.id, label: c.companyName }))
              ]}
              value={editForm.clientId}
              onChange={(e) => setEditForm({ ...editForm, clientId: e.target.value })}
            />
            <Select
              label="Assegnato a"
              options={[
                { value: '', label: 'Non assegnato' },
                ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
              ]}
              value={editForm.assigneeId}
              onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
            />
            <Select
              label="Tipo Attività"
              options={TASK_TYPE_OPTIONS}
              value={editForm.taskType}
              onChange={(e) => setEditForm({ ...editForm, taskType: e.target.value })}
            />
            <Select
              label="Priorità"
              options={PRIORITY_OPTIONS.filter(o => o.value !== '')}
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            />
            <Select
              label="Stato"
              options={TASK_STATUS_OPTIONS.filter(o => o.value !== '')}
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            />
            <div>
              <Input
                label="Scadenza"
                type="datetime-local"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Descrizione</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditTaskId(null)}>Annulla</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTaskId} onClose={() => setDeleteTaskId(null)} title="Elimina Attività" size="sm">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <p className="text-sm text-muted">Sei sicuro di voler eliminare questa attività? L&apos;azione non è reversibile.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
