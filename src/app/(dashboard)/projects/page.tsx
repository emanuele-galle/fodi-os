'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FolderKanban, Plus, Search, ChevronLeft, ChevronRight, Building2, AlertCircle,
  LayoutGrid, List, Columns3, Download, MoreVertical, Copy, Archive, Trash2, Pencil,
  FolderOpen, CheckCircle2, Clock, AlertTriangle, ArrowUpDown, DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
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

interface Project {
  id: string
  name: string
  status: string
  priority: string
  color: string | null
  startDate: string | null
  endDate: string | null
  client?: { companyName: string } | null
  _count?: { tasks: number }
  completedTasks?: number
  budgetAmount?: string | null
  budgetHours?: number | null
}

interface ClientOption {
  id: string
  companyName: string
}

type ViewMode = 'grid' | 'table' | 'kanban'
type SortField = 'name' | 'createdAt' | 'endDate' | 'priority'

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'PLANNING', label: 'Pianificazione' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'ON_HOLD', label: 'In Pausa' },
  { value: 'REVIEW', label: 'Revisione' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione', IN_PROGRESS: 'In Corso', ON_HOLD: 'In Pausa', REVIEW: 'Revisione', COMPLETED: 'Completato', CANCELLED: 'Cancellato',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'Tutte le priorita' },
  ...PRIORITY_OPTIONS,
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'createdAt', label: 'Data creazione' },
  { value: 'endDate', label: 'Scadenza' },
  { value: 'priority', label: 'Priorita' },
]

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'var(--color-primary)',
  IN_PROGRESS: 'var(--color-accent)',
  ON_HOLD: 'var(--color-warning)',
  REVIEW: 'var(--color-primary)',
  COMPLETED: 'var(--color-muted)',
  CANCELLED: 'var(--color-destructive)',
}

const KANBAN_COLUMNS = [
  { key: 'PLANNING', label: 'Pianificazione' },
  { key: 'IN_PROGRESS', label: 'In Corso' },
  { key: 'ON_HOLD', label: 'In Pausa' },
  { key: 'REVIEW', label: 'Revisione' },
  { key: 'COMPLETED', label: 'Completato' },
]

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

// --- Kanban helpers ---

const kanbanCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  const columnHit = pointerCollisions.find((c) => String(c.id).startsWith('column-'))
  if (columnHit) return [columnHit]
  if (pointerCollisions.length > 0) return pointerCollisions
  const rectCollisions = rectIntersection(args)
  const rectColumnHit = rectCollisions.find((c) => String(c.id).startsWith('column-'))
  if (rectColumnHit) return [rectColumnHit]
  return rectCollisions
}

function DroppableColumn({ columnKey, children }: { columnKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: { type: 'column', columnKey },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[75vw] md:w-64 snap-center md:snap-align-none rounded-lg p-3 transition-colors min-h-[200px] ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-secondary/30'
      }`}
    >
      {children}
    </div>
  )
}

function KanbanProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const totalTasks = project._count?.tasks ?? 0
  const doneTasks = project.completedTasks ?? 0

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-md border border-border p-3 cursor-pointer hover:shadow-sm transition-shadow"
      style={{ borderLeft: `3px solid ${project.color || STATUS_COLORS[project.status] || 'var(--color-primary)'}` }}
    >
      <p className="font-medium text-sm mb-1.5 truncate">{project.name}</p>
      {project.client && (
        <p className="text-[11px] text-muted mb-2">{project.client.companyName}</p>
      )}
      <div className="flex items-center justify-between">
        <Badge status={project.priority} className="text-[10px]">
          {PRIORITY_LABELS[project.priority] || project.priority}
        </Badge>
        <span className="text-[10px] text-muted">
          {totalTasks > 0 ? `${doneTasks}/${totalTasks}` : '0 task'}
        </span>
      </div>
      {project.endDate && (
        <p className="text-[10px] text-muted mt-1.5">
          Scadenza: {new Date(project.endDate).toLocaleDateString('it-IT')}
        </p>
      )}
    </div>
  )
}

function KanbanOverlayCard({ project }: { project: Project }) {
  return (
    <div className="bg-card rounded-md border-2 border-primary p-3 shadow-lg w-60">
      <p className="font-medium text-sm mb-1">{project.name}</p>
      <Badge status={project.priority} className="text-[10px]">
        {PRIORITY_LABELS[project.priority] || project.priority}
      </Badge>
    </div>
  )
}

// --- Main Page ---

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  // Kanban drag state
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const limit = 20

  const projectForm = useFormPersist('new-project', {
    name: '',
    clientId: '',
    description: '',
    priority: 'MEDIUM',
    startDate: '',
    endDate: '',
    budgetAmount: '',
    budgetHours: '',
    color: '#6366F1',
  })

  // Open modal if ?action=new is in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setModalOpen(true)
      router.replace('/projects', { scroll: false })
    }
  }, [searchParams, router])

  // Close action menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null)
      }
    }
    if (actionMenuId) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [actionMenuId])

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), isInternal: 'false' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/projects?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei progetti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei progetti')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  // Fetch all projects (no pagination) for stats and kanban
  const fetchAllProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?limit=500&isInternal=false')
      if (res.ok) {
        const data = await res.json()
        setAllProjects(data.items || [])
      }
    } catch {
      // silently fail for stats
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchAllProjects()
  }, [fetchAllProjects])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    fetch('/api/clients?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.items) setClients(d.items)
    })
  }, [])

  const totalPages = Math.ceil(total / limit)

  // Stats computed from allProjects
  const stats = useMemo(() => {
    const totalCount = allProjects.length
    const inProgress = allProjects.filter((p) => p.status === 'IN_PROGRESS').length
    const completed = allProjects.filter((p) => p.status === 'COMPLETED').length
    const now = new Date()
    const overdue = allProjects.filter((p) => {
      if (!p.endDate) return false
      return new Date(p.endDate) < now && p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
    }).length
    return { totalCount, inProgress, completed, overdue }
  }, [allProjects])

  // Client-side filtering for priority and client (API does not support these)
  const filteredProjects = useMemo(() => {
    let result = [...projects]
    if (priorityFilter) {
      result = result.filter((p) => p.priority === priorityFilter)
    }
    if (clientFilter) {
      result = result.filter((p) => p.client?.companyName === clientFilter)
    }
    // Sort
    result.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.name.localeCompare(b.name, 'it')
        case 'createdAt':
          return (a.startDate || '').localeCompare(b.startDate || '')
        case 'endDate': {
          if (!a.endDate && !b.endDate) return 0
          if (!a.endDate) return 1
          if (!b.endDate) return -1
          return a.endDate.localeCompare(b.endDate)
        }
        case 'priority':
          return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
        default:
          return 0
      }
    })
    return result
  }, [projects, priorityFilter, clientFilter, sortField])

  // Kanban: group allProjects by status (use allProjects for kanban to show all)
  const kanbanProjects = useMemo(() => {
    let result = [...allProjects]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (priorityFilter) {
      result = result.filter((p) => p.priority === priorityFilter)
    }
    if (clientFilter) {
      result = result.filter((p) => p.client?.companyName === clientFilter)
    }
    const byStatus: Record<string, Project[]> = {}
    for (const col of KANBAN_COLUMNS) {
      byStatus[col.key] = []
    }
    for (const p of result) {
      if (byStatus[p.status]) {
        byStatus[p.status].push(p)
      } else {
        // Put CANCELLED or unknown status in last column
        byStatus['COMPLETED']?.push(p)
      }
    }
    return byStatus
  }, [allProjects, search, priorityFilter, clientFilter])

  // Unique client names for client filter
  const clientOptions = useMemo(() => {
    const names = new Set<string>()
    allProjects.forEach((p) => {
      if (p.client?.companyName) names.add(p.client.companyName)
    })
    return [
      { value: '', label: 'Tutti i clienti' },
      ...Array.from(names).sort().map((n) => ({ value: n, label: n })),
    ]
  }, [allProjects])

  // Kanban drag handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const project = allProjects.find((p) => p.id === id)
    if (project) setActiveProject(project)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveProject(null)
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    const overId = String(over.id)
    let targetStatus: string | null = null

    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '')
    }
    if (!targetStatus) return

    const project = allProjects.find((p) => p.id === projectId)
    if (!project || project.status === targetStatus) return

    // Optimistic update
    setAllProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: targetStatus! } : p))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        setAllProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
        )
      } else {
        fetchProjects()
      }
    } catch {
      setAllProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: project.status } : p))
      )
    }
  }

  // Quick actions
  async function handleDuplicate(projectId: string) {
    setActionMenuId(null)
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (copia)`,
          priority: project.priority,
          color: project.color,
          startDate: project.startDate ? new Date(project.startDate).toISOString() : undefined,
          endDate: project.endDate ? new Date(project.endDate).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        fetchProjects()
        fetchAllProjects()
      }
    } catch {
      // silently fail
    }
  }

  async function handleArchive(projectId: string) {
    setActionMenuId(null)
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      fetchProjects()
      fetchAllProjects()
    } catch {
      // silently fail
    }
  }

  async function handleDelete(projectId: string) {
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDeleteId(null)
        fetchProjects()
        fetchAllProjects()
      }
    } catch {
      // silently fail
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // CSV export
  function handleExportCSV() {
    const dataToExport = viewMode === 'kanban' ? allProjects : filteredProjects
    const headers = ['Nome', 'Stato', 'Priorita', 'Cliente', 'Data Inizio', 'Scadenza', 'Task Totali', 'Task Completati', 'Budget (EUR)', 'Ore Previste']
    const rows = dataToExport.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      STATUS_LABELS[p.status] || p.status,
      PRIORITY_LABELS[p.priority] || p.priority,
      p.client?.companyName || '',
      p.startDate ? new Date(p.startDate).toLocaleDateString('it-IT') : '',
      p.endDate ? new Date(p.endDate).toLocaleDateString('it-IT') : '',
      String(p._count?.tasks ?? 0),
      String(p.completedTasks ?? 0),
      p.budgetAmount ? parseFloat(p.budgetAmount).toFixed(2) : '',
      p.budgetHours != null ? String(p.budgetHours) : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `progetti_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(projectForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    if (body.budgetAmount) body.budgetAmount = parseFloat(body.budgetAmount as string)
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    if (body.startDate) body.startDate = new Date(body.startDate as string).toISOString()
    if (body.endDate) body.endDate = new Date(body.endDate as string).toISOString()
    if (body.deadline) body.deadline = new Date(body.deadline as string).toISOString()
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        projectForm.reset()
        setFormError('')
        setModalOpen(false)
        fetchProjects()
        fetchAllProjects()
      } else {
        const data = await res.json().catch(() => null)
        if (data?.details) {
          const msgs = Object.values(data.details).flat().filter(Boolean) as string[]
          setFormError(msgs.join('. ') || data.error || 'Errore nella creazione')
        } else {
          setFormError(data?.error || 'Errore nella creazione del progetto')
        }
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Action menu component ---
  function ActionMenu({ project }: { project: Project }) {
    const isOpen = actionMenuId === project.id
    return (
      <div className="relative inline-block" ref={isOpen ? actionMenuRef : undefined}>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            setActionMenuId(isOpen ? null : project.id)
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
            <button
              onClick={(e) => { e.stopPropagation(); setActionMenuId(null); router.push(`/projects/${project.id}`) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Modifica
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDuplicate(project.id) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplica
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleArchive(project.id) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Archivia
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActionMenuId(null); setConfirmDeleteId(project.id) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Elimina
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- Budget progress bar ---
  function BudgetBar({ project }: { project: Project }) {
    if (!project.budgetAmount) return null
    const budget = parseFloat(project.budgetAmount)
    if (!budget || budget <= 0) return null
    // Estimate spent based on completed tasks ratio as a proxy
    const totalTasks = project._count?.tasks ?? 0
    const doneTasks = project.completedTasks ?? 0
    const spentRatio = totalTasks > 0 ? doneTasks / totalTasks : 0
    const spent = budget * spentRatio
    const percent = Math.min(Math.round(spentRatio * 100), 100)

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Budget
          </span>
          <span>{spent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} / {budget.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  // --- Project card for grid view ---
  function ProjectGridCard({ p }: { p: Project }) {
    const totalTasks = p._count?.tasks ?? 0
    const doneTasks = p.completedTasks ?? 0
    return (
      <Card
        className="cursor-pointer overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] transition-all duration-200 touch-manipulation active:scale-[0.98] relative group"
        onClick={() => router.push(`/projects/${p.id}`)}
        style={{ borderTop: `3px solid ${p.color || STATUS_COLORS[p.status] || 'var(--color-primary)'}` }}
      >
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold truncate text-sm md:text-base flex-1">{p.name}</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <ActionMenu project={p} />
            </div>
          </div>
          {p.client && (
            <p className="text-xs text-muted mb-3">{p.client.companyName}</p>
          )}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusBadge
              leftLabel="Stato"
              rightLabel={STATUS_LABELS[p.status] || p.status}
              status={p.status}
            />
            <Badge status={p.priority}>
              {PRIORITY_LABELS[p.priority] || p.priority}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {totalTasks > 0 ? `${doneTasks}/${totalTasks} task` : 'Nessun task'}
            </span>
            {p.endDate && (
              <span>Scadenza: {new Date(p.endDate).toLocaleDateString('it-IT')}</span>
            )}
          </div>
          {totalTasks > 0 && (
            <div className="mt-2.5 relative">
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-primary"
                  style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted mt-1 block text-right">
                {Math.round((doneTasks / totalTasks) * 100)}%
              </span>
            </div>
          )}
          <BudgetBar project={p} />
        </CardContent>
      </Card>
    )
  }

  // --- Render views ---

  function renderGridView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
        {filteredProjects.map((p) => (
          <ProjectGridCard key={p.id} p={p} />
        ))}
      </div>
    )
  }

  function renderTableView() {
    return (
      <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-left">
              <th className="py-3 px-4 font-medium text-muted">Nome</th>
              <th className="py-3 px-4 font-medium text-muted hidden sm:table-cell">Cliente</th>
              <th className="py-3 px-4 font-medium text-muted">Stato</th>
              <th className="py-3 px-4 font-medium text-muted hidden md:table-cell">Priorita</th>
              <th className="py-3 px-4 font-medium text-muted hidden md:table-cell">Progresso</th>
              <th className="py-3 px-4 font-medium text-muted hidden lg:table-cell">Scadenza</th>
              <th className="py-3 px-4 font-medium text-muted hidden lg:table-cell">Budget</th>
              <th className="py-3 px-4 text-right font-medium text-muted">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const totalTasks = p._count?.tasks ?? 0
              const doneTasks = p.completedTasks ?? 0
              const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/20 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: p.color || STATUS_COLORS[p.status] || 'var(--color-primary)' }}
                      />
                      <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted hidden sm:table-cell">{p.client?.companyName || '-'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge
                      leftLabel="Stato"
                      rightLabel={STATUS_LABELS[p.status] || p.status}
                      status={p.status}
                    />
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <Badge status={p.priority}>
                      {PRIORITY_LABELS[p.priority] || p.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden flex-1">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <span className="text-xs text-muted w-8 text-right">{progressPercent}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted hidden lg:table-cell">
                    {p.endDate ? new Date(p.endDate).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td className="py-3 px-4 text-muted hidden lg:table-cell">
                    {p.budgetAmount ? parseFloat(p.budgetAmount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu project={p} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderKanbanView() {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
          {KANBAN_COLUMNS.map((col) => {
            const colProjects = kanbanProjects[col.key] || []
            return (
              <DroppableColumn key={col.key} columnKey={col.key}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{col.label}</span>
                  <span className="text-xs text-muted bg-secondary rounded-full px-2 py-0.5">
                    {colProjects.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {colProjects.map((project) => (
                    <KanbanProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => router.push(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              </DroppableColumn>
            )
          })}
        </div>
        <DragOverlay>
          {activeProject && <KanbanOverlayCard project={activeProject} />}
        </DragOverlay>
      </DndContext>
    )
  }

  const showPagination = viewMode !== 'kanban' && totalPages > 1
  const showContent = viewMode === 'kanban' || filteredProjects.length > 0
  const showEmptyFiltered = viewMode !== 'kanban' && !loading && filteredProjects.length === 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Progetti Clienti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione e monitoraggio progetti attivi</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Esporta CSV
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Progetto
          </Button>
        </div>
        <div className="flex sm:hidden gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
          <Button onClick={() => setModalOpen(true)} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Progetto
          </Button>
        </div>
      </div>

      {/* Stats header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-primary" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Totale Progetti</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{stats.totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-accent" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">In Corso</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-[var(--color-accent)]" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Completati</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full text-destructive" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">In Ritardo</p>
              <p className="text-xl sm:text-2xl font-bold animate-count-up">{stats.overdue}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Internal projects link */}
      <button
        onClick={() => router.push('/internal')}
        className="flex items-center gap-2 w-full mb-4 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary touch-manipulation"
      >
        <Building2 className="h-4 w-4" />
        <span>Vedi progetti interni FODI</span>
        <ChevronRight className="h-4 w-4 ml-auto" />
      </button>

      {/* Filters & view toggle */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Cerca progetti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Status filter */}
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44"
          />
          {/* Priority filter */}
          <Select
            options={PRIORITY_FILTER_OPTIONS}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-44"
          />
          {/* Client filter */}
          <Select
            options={clientOptions}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full sm:w-44"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted flex-shrink-0" />
            <Select
              options={SORT_OPTIONS}
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-40 sm:w-44"
            />
          </div>
          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Vista griglia"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Vista tabella"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 transition-colors ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
              title="Vista kanban"
            >
              <Columns3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchProjects()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : showEmptyFiltered ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto trovato"
          description={search || statusFilter || priorityFilter || clientFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo progetto per iniziare.'}
          action={
            !search && !statusFilter && !priorityFilter && !clientFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Progetto
              </Button>
            ) : undefined
          }
        />
      ) : showContent ? (
        <>
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'kanban' && renderKanbanView()}

          {showPagination && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted">{total} progetti totali</p>
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
      ) : null}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Conferma eliminazione" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Sei sicuro di voler eliminare questo progetto? Questa azione non puo essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annulla</Button>
              <Button variant="destructive" loading={deleteSubmitting} onClick={() => handleDelete(confirmDeleteId)}>
                Elimina
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create project modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Progetto" size="lg">
        <form onSubmit={handleCreateProject} className="space-y-4">
          {projectForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={projectForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}
          <Input label="Nome Progetto *" required value={projectForm.values.name} onChange={(e) => projectForm.setValue('name', e.target.value)} />
          <Select
            label="Cliente"
            value={projectForm.values.clientId}
            onChange={(e) => projectForm.setValue('clientId', e.target.value)}
            options={[
              { value: '', label: 'Seleziona cliente' },
              ...clients.map((c) => ({ value: c.id, label: c.companyName })),
            ]}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              rows={3}
              value={projectForm.values.description}
              onChange={(e) => projectForm.setValue('description', e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Select label="Priorita" options={PRIORITY_OPTIONS} value={projectForm.values.priority} onChange={(e) => projectForm.setValue('priority', e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data Inizio" type="date" value={projectForm.values.startDate} onChange={(e) => projectForm.setValue('startDate', e.target.value)} />
            <Input label="Data Fine" type="date" value={projectForm.values.endDate} onChange={(e) => projectForm.setValue('endDate', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Budget (EUR)" type="number" step="0.01" value={projectForm.values.budgetAmount} onChange={(e) => projectForm.setValue('budgetAmount', e.target.value)} />
            <Input label="Ore Previste" type="number" value={projectForm.values.budgetHours} onChange={(e) => projectForm.setValue('budgetHours', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Colore</label>
            <input
              type="color"
              value={projectForm.values.color}
              onChange={(e) => projectForm.setValue('color', e.target.value)}
              className="h-10 w-20 rounded-md border border-border cursor-pointer"
            />
          </div>
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Crea Progetto</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
