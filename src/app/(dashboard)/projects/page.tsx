'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface Project {
  id: string
  name: string
  status: string
  priority: string
  startDate: string | null
  endDate: string | null
  client?: { companyName: string } | null
  _count?: { tasks: number }
  completedTasks?: number
}

interface ClientOption {
  id: string
  companyName: string
}

interface WorkspaceOption {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'PLANNING', label: 'Pianificazione' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'ON_HOLD', label: 'In Pausa' },
  { value: 'REVIEW', label: 'Revisione' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PLANNING: 'default', IN_PROGRESS: 'success', ON_HOLD: 'warning', REVIEW: 'default', COMPLETED: 'outline', CANCELLED: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione', IN_PROGRESS: 'In Corso', ON_HOLD: 'In Pausa', REVIEW: 'Revisione', COMPLETED: 'Completato', CANCELLED: 'Cancellato',
}
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
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

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#C4A052',
  IN_PROGRESS: '#22C55E',
  ON_HOLD: '#F59E0B',
  REVIEW: '#3B82F6',
  COMPLETED: '#64748B',
  CANCELLED: '#EF4444',
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const limit = 20

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/projects?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.items || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    fetch('/api/clients?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.items) setClients(d.items)
    })
    fetch('/api/workspaces').then((r) => r.ok ? r.json() : null).then((d) => {
      if (Array.isArray(d)) setWorkspaces(d)
      else if (d?.items) setWorkspaces(d.items)
    })
  }, [])

  const totalPages = Math.ceil(total / limit)

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.budgetAmount) body.budgetAmount = parseFloat(body.budgetAmount as string)
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchProjects()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Progetti</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca progetti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo progetto per iniziare.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Progetto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {projects.map((p) => {
              const totalTasks = p._count?.tasks ?? 0
              const doneTasks = p.completedTasks ?? 0
              return (
                <Card
                  key={p.id}
                  className="cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/projects/${p.id}`)}
                  style={{ borderTop: `3px solid ${STATUS_COLORS[p.status] || '#C4A052'}` }}
                >
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold truncate">{p.name}</span>
                    </div>
                    {p.client && (
                      <p className="text-xs text-muted mb-3">{p.client.companyName}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={STATUS_BADGE[p.status] || 'default'}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                      <Badge variant={PRIORITY_BADGE[p.priority] || 'default'}>
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
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-[#C4A052] to-[#E8C97A]"
                          style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
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
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Progetto" size="lg">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input name="name" label="Nome Progetto *" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              name="workspaceId"
              label="Workspace *"
              options={[
                { value: '', label: 'Seleziona workspace' },
                ...workspaces.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Select
              name="clientId"
              label="Cliente"
              options={[
                { value: '', label: 'Seleziona cliente' },
                ...clients.map((c) => ({ value: c.id, label: c.companyName })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Select name="priority" label="Priorità" options={PRIORITY_OPTIONS} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="startDate" label="Data Inizio" type="date" />
            <Input name="endDate" label="Data Fine" type="date" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="budgetAmount" label="Budget (EUR)" type="number" step="0.01" />
            <Input name="budgetHours" label="Ore Previste" type="number" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Crea Progetto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
