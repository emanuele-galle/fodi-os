'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import { FolderKanban, Plus, Search, ChevronLeft, ChevronRight, Building2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

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
}

interface ClientOption {
  id: string
  companyName: string
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
  PLANNING: 'var(--color-primary)',
  IN_PROGRESS: 'var(--color-accent)',
  ON_HOLD: 'var(--color-warning)',
  REVIEW: 'var(--color-primary)',
  COMPLETED: 'var(--color-muted)',
  CANCELLED: 'var(--color-destructive)',
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
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
  }, [])

  const totalPages = Math.ceil(total / limit)

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(projectForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    // Convert numeric fields
    if (body.budgetAmount) body.budgetAmount = parseFloat(body.budgetAmount as string)
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    // Convert date fields to ISO datetime
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

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Progetti Clienti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione e monitoraggio progetti attivi</p>
          </div>
        </div>
        <div className="hidden sm:block">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Progetto
          </Button>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto
        </Button>
      </div>

      <button
        onClick={() => router.push('/internal')}
        className="flex items-center gap-2 w-full mb-4 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary touch-manipulation"
      >
        <Building2 className="h-4 w-4" />
        <span>Vedi progetti interni FODI</span>
        <ChevronRight className="h-4 w-4 ml-auto" />
      </button>

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

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchProjects()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

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
                  className="cursor-pointer overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] transition-all duration-200 touch-manipulation active:scale-[0.98]"
                  onClick={() => router.push(`/projects/${p.id}`)}
                  style={{ borderTop: `3px solid ${p.color || STATUS_COLORS[p.status] || 'var(--color-primary)'}` }}
                >
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold truncate text-sm md:text-base">{p.name}</span>
                    </div>
                    {p.client && (
                      <p className="text-xs text-muted mb-3">{p.client.companyName}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <StatusBadge
                        leftLabel="Stato"
                        rightLabel={STATUS_LABELS[p.status] || p.status}
                        variant={p.status === 'IN_PROGRESS' ? 'success' : p.status === 'ON_HOLD' ? 'warning' : p.status === 'CANCELLED' ? 'error' : p.status === 'COMPLETED' ? 'default' : 'info'}
                      />
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
                      <div className="mt-2.5 relative">
                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-primary"
                            style={{
                              width: `${(doneTasks / totalTasks) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted mt-1 block text-right">
                          {Math.round((doneTasks / totalTasks) * 100)}%
                        </span>
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
          <Select label="Priorità" options={PRIORITY_OPTIONS} value={projectForm.values.priority} onChange={(e) => projectForm.setValue('priority', e.target.value)} />
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
