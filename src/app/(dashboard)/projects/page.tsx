'use client'
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import {
  FolderKanban, Plus, Search, ChevronLeft, ChevronRight, Building2, AlertCircle,
  LayoutGrid, List, Columns3, Download, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

import {
  type Project, type ClientOption, type ViewMode, type SortField, type SortDirection,
  STATUS_OPTIONS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_FILTER_OPTIONS, SORT_OPTIONS,
  KANBAN_COLUMNS, PRIORITY_ORDER,
} from '@/components/projects/types'
import { ProjectStatsHeader } from '@/components/projects/ProjectStatsHeader'
import { ProjectGridCard } from '@/components/projects/ProjectGridCard'
import { ProjectTableView } from '@/components/projects/ProjectTableView'
import { ProjectKanbanView } from '@/components/projects/ProjectKanbanView'
import { ProjectActionMenu } from '@/components/projects/ProjectActionMenu'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'

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
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const limit = 20

  const projectForm = useFormPersist('new-project', {
    name: '', clientId: '', description: '', priority: 'MEDIUM',
    startDate: '', endDate: '', budgetAmount: '', budgetHours: '', color: '#6366F1',
  })

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

  const fetchAllProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?limit=500&isInternal=false')
      if (res.ok) {
        const data = await res.json()
        setAllProjects(data.items || [])
      }
    } catch {}
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { fetchAllProjects() }, [fetchAllProjects])
  useRealtimeRefresh('project', fetchProjects)
  useEffect(() => { setPage(1) }, [search, statusFilter])
  useEffect(() => {
    fetch('/api/clients?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.items) setClients(d.items)
    })
  }, [])

  const totalPages = Math.ceil(total / limit)

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

  const filteredProjects = useMemo(() => {
    let result = [...projects]
    if (priorityFilter) result = result.filter((p) => p.priority === priorityFilter)
    if (clientFilter) result = result.filter((p) => p.client?.companyName === clientFilter)
    const dir = sortDirection === 'asc' ? 1 : -1
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name, 'it'); break
        case 'createdAt': cmp = (a.startDate || '').localeCompare(b.startDate || ''); break
        case 'endDate':
          if (!a.endDate && !b.endDate) cmp = 0
          else if (!a.endDate) cmp = 1
          else if (!b.endDate) cmp = -1
          else cmp = a.endDate.localeCompare(b.endDate)
          break
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99); break
        case 'client': cmp = (a.client?.companyName || '').localeCompare(b.client?.companyName || '', 'it'); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'budget': cmp = parseFloat(a.budgetAmount || '0') - parseFloat(b.budgetAmount || '0'); break
      }
      return cmp * dir
    })
    return result
  }, [projects, priorityFilter, clientFilter, sortField, sortDirection])

  const kanbanProjects = useMemo(() => {
    let result = [...allProjects]
    if (search) { const q = search.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q)) }
    if (priorityFilter) result = result.filter((p) => p.priority === priorityFilter)
    if (clientFilter) result = result.filter((p) => p.client?.companyName === clientFilter)
    const byStatus: Record<string, Project[]> = {}
    for (const col of KANBAN_COLUMNS) byStatus[col.key] = []
    for (const p of result) {
      if (byStatus[p.status]) byStatus[p.status].push(p)
      else byStatus['COMPLETED']?.push(p)
    }
    return byStatus
  }, [allProjects, search, priorityFilter, clientFilter])

  const clientOptions = useMemo(() => {
    const names = new Set<string>()
    allProjects.forEach((p) => { if (p.client?.companyName) names.add(p.client.companyName) })
    return [{ value: '', label: 'Tutti i clienti' }, ...Array.from(names).sort().map((n) => ({ value: n, label: n }))]
  }, [allProjects])

  function handleColumnSort(field: SortField) {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDirection('asc') }
  }

  async function handleDuplicate(projectId: string) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${project.name} (copia)`, priority: project.priority, color: project.color,
          startDate: project.startDate ? new Date(project.startDate).toISOString() : undefined,
          endDate: project.endDate ? new Date(project.endDate).toISOString() : undefined }),
      })
      if (res.ok) { fetchProjects(); fetchAllProjects() }
    } catch {}
  }

  async function handleArchive(projectId: string) {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELLED' }) })
      fetchProjects(); fetchAllProjects()
    } catch {}
  }

  async function handleDelete(projectId: string) {
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) { setConfirmDeleteId(null); fetchProjects(); fetchAllProjects() }
    } catch {} finally { setDeleteSubmitting(false) }
  }

  function handleExportCSV() {
    const dataToExport = viewMode === 'kanban' ? allProjects : filteredProjects
    const headers = ['Nome', 'Stato', 'Priorita', 'Cliente', 'Data Inizio', 'Scadenza', 'Task Totali', 'Task Completati', 'Budget (EUR)', 'Ore Previste']
    const rows = dataToExport.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`, STATUS_LABELS[p.status] || p.status, PRIORITY_LABELS[p.priority] || p.priority,
      p.client?.companyName || '', p.startDate ? new Date(p.startDate).toLocaleDateString('it-IT') : '',
      p.endDate ? new Date(p.endDate).toLocaleDateString('it-IT') : '', String(p._count?.tasks ?? 0), String(p.completedTasks ?? 0),
      p.budgetAmount ? parseFloat(p.budgetAmount).toFixed(2) : '', p.budgetHours != null ? String(p.budgetHours) : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `progetti_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true); setFormError('')
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
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { projectForm.reset(); setFormError(''); setModalOpen(false); fetchProjects(); fetchAllProjects() }
      else {
        const data = await res.json().catch(() => null)
        if (data?.details) { const msgs = Object.values(data.details).flat().filter(Boolean) as string[]; setFormError(msgs.join('. ') || data.error || 'Errore nella creazione') }
        else setFormError(data?.error || 'Errore nella creazione del progetto')
      }
    } catch { setFormError('Errore di rete') } finally { setSubmitting(false) }
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
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4" />Esporta CSV</Button>
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Nuovo Progetto</Button>
        </div>
        <div className="flex sm:hidden gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex-1"><Download className="h-4 w-4 mr-2" />Esporta</Button>
          <Button onClick={() => setModalOpen(true)} className="flex-1"><Plus className="h-4 w-4 mr-2" />Nuovo Progetto</Button>
        </div>
      </div>

      <ProjectStatsHeader {...stats} />

      {/* Internal projects link */}
      <button onClick={() => router.push('/internal')} className="flex items-center gap-2 w-full mb-4 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary touch-manipulation">
        <Building2 className="h-4 w-4" /><span>Vedi progetti interni {brandClient.slug.toUpperCase()}</span><ChevronRight className="h-4 w-4 ml-auto" />
      </button>

      {/* Filters & view toggle */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input placeholder="Cerca progetti..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-44" />
          <Select options={PRIORITY_FILTER_OPTIONS} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full sm:w-44" />
          <Select options={clientOptions} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-full sm:w-44" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted flex-shrink-0" />
            <Select options={SORT_OPTIONS} value={sortField} onChange={(e) => setSortField(e.target.value as SortField)} className="w-40 sm:w-44" />
            <button onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))} className="p-2.5 sm:p-1.5 rounded-md hover:bg-secondary transition-colors touch-manipulation" title={sortDirection === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'} aria-label={sortDirection === 'asc' ? 'Ordine crescente' : 'Ordine decrescente'}>
              {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
            </button>
          </div>
          <div className="flex items-center border border-border rounded-md overflow-hidden flex-shrink-0">
            {([['grid', LayoutGrid, 'Vista griglia'], ['table', List, 'Vista tabella'], ['kanban', Columns3, 'Vista kanban']] as const).map(([mode, Icon, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`p-2.5 sm:p-2 transition-colors touch-manipulation ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`} title={label} aria-label={label}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" /><p className="text-sm text-destructive">{fetchError}</p></div>
          <button onClick={() => fetchProjects()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-36" />))}
        </div>
      ) : showEmptyFiltered ? (
        <EmptyState icon={FolderKanban} title="Nessun progetto trovato"
          description={search || statusFilter || priorityFilter || clientFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo progetto per iniziare.'}
          action={!search && !statusFilter && !priorityFilter && !clientFilter ? (<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuovo Progetto</Button>) : undefined}
        />
      ) : showContent ? (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
              {filteredProjects.map((p) => (
                <ProjectGridCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)}
                  actionMenu={<ProjectActionMenu project={p} onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={(id) => setConfirmDeleteId(id)} />}
                />
              ))}
            </div>
          )}
          {viewMode === 'table' && (
            <ProjectTableView projects={filteredProjects} sortField={sortField} sortDirection={sortDirection}
              onColumnSort={handleColumnSort} onProjectClick={(id) => router.push(`/projects/${id}`)}
              renderActionMenu={(p) => <ProjectActionMenu project={p} onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={(id) => setConfirmDeleteId(id)} />}
            />
          )}
          {viewMode === 'kanban' && (
            <ProjectKanbanView kanbanProjects={kanbanProjects} activeProject={activeProject} allProjects={allProjects}
              setActiveProject={setActiveProject} setAllProjects={setAllProjects} fetchProjects={fetchProjects}
              onProjectClick={(id) => router.push(`/projects/${id}`)}
            />
          )}

          {showPagination && (
            <div className="flex items-center justify-between mt-6 gap-2">
              <p className="text-sm text-muted">{total} progetti totali</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" aria-label="Pagina precedente"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-muted">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" aria-label="Pagina successiva"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Conferma eliminazione" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-muted">Sei sicuro di voler eliminare questo progetto? Questa azione non puo essere annullata.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Annulla</Button>
              <Button variant="destructive" loading={deleteSubmitting} onClick={() => handleDelete(confirmDeleteId)}>Elimina</Button>
            </div>
          </div>
        </Modal>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} clients={clients}
        projectForm={projectForm} formError={formError} submitting={submitting} onSubmit={handleCreateProject}
      />
    </div>
  )
}
