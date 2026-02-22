'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wand2, Plus, Search, ChevronLeft, ChevronRight, Copy, Trash2,
  AlertCircle, Globe, FileText, ClipboardList, LayoutGrid, List,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'

interface WizardTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  isSystem: boolean
  status: string
  createdAt: string
  _count: { steps: number; submissions: number }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'PUBLISHED', label: 'Pubblicato' },
  { value: 'ARCHIVED', label: 'Archiviato' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tutte le categorie' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'survey', label: 'Sondaggio' },
  { value: 'intake', label: 'Intake' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'custom', label: 'Personalizzato' },
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicato',
  ARCHIVED: 'Archiviato',
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  survey: 'Sondaggio',
  intake: 'Intake',
  feedback: 'Feedback',
  custom: 'Personalizzato',
}

const CATEGORY_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'info' | 'outline'> = {
  onboarding: 'success',
  survey: 'warning',
  intake: 'default',
  feedback: 'info',
  custom: 'outline',
}

const CATEGORY_BORDER_COLOR: Record<string, string> = {
  onboarding: 'border-t-emerald-500',
  survey: 'border-t-amber-500',
  intake: 'border-t-primary',
  feedback: 'border-t-blue-500',
  custom: 'border-t-zinc-400',
}

type ViewMode = 'grid' | 'list'

export function WizardList() {
  const router = useRouter()
  const [wizards, setWizards] = useState<WizardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<WizardTemplate | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const limit = 20

  const fetchWizards = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/wizards?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWizards(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei wizard')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei wizard')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchWizards() }, [fetchWizards])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  // Client-side category filter
  const filteredWizards = useMemo(() => {
    if (!categoryFilter) return wizards
    return wizards.filter((w) => w.category === categoryFilter)
  }, [wizards, categoryFilter])

  // Stats computed from the current fetched wizards
  const stats = useMemo(() => {
    const totalCount = wizards.length
    const published = wizards.filter((w) => w.status === 'PUBLISHED').length
    const drafts = wizards.filter((w) => w.status === 'DRAFT').length
    const totalSubmissions = wizards.reduce((sum, w) => sum + w._count.submissions, 0)
    return { totalCount, published, drafts, totalSubmissions }
  }, [wizards])

  async function handleDelete() {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/wizards/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchWizards()
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDuplicate(id: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/wizards/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        router.push(`/erp/wizards/${data.id}`)
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Action Button */}
      <div className="flex justify-end mb-4">
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => router.push('/erp/wizards/new')}>
            <Plus className="h-4 w-4" />
            Nuovo Wizard
          </Button>
        </div>
        <Button onClick={() => router.push('/erp/wizards/new')} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuovo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
            <Wand2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted">Wizard Totali</p>
            <p className="text-lg font-bold">{loading ? '-' : stats.totalCount}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted">Pubblicati</p>
            <p className="text-lg font-bold">{loading ? '-' : stats.published}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted">Bozze</p>
            <p className="text-lg font-bold">{loading ? '-' : stats.drafts}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted">Compilazioni Totali</p>
            <p className="text-lg font-bold">{loading ? '-' : stats.totalSubmissions}</p>
          </div>
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca wizard..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Select
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground hover:bg-secondary/50'}`}
            title="Vista griglia"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground hover:bg-secondary/50'}`}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchWizards()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredWizards.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="Nessun wizard trovato"
          description={search || statusFilter || categoryFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo wizard.'}
          action={
            !search && !statusFilter && !categoryFilter ? (
              <Button onClick={() => router.push('/erp/wizards/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Wizard
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View (always cards on mobile) */}
          <div className="md:hidden space-y-3">
            {filteredWizards.map((w) => (
              <div
                key={w.id}
                onClick={() => router.push(`/erp/wizards/${w.id}`)}
                className={`rounded-lg border border-border border-t-2 ${CATEGORY_BORDER_COLOR[w.category] || 'border-t-zinc-300 dark:border-t-zinc-600'} bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm truncate">{w.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge status={w.status}>
                      {STATUS_LABELS[w.status] || w.status}
                    </Badge>
                    {w.category && (
                      <Badge variant={CATEGORY_BADGE_VARIANT[w.category] || 'outline'}>
                        {CATEGORY_LABELS[w.category] || w.category}
                      </Badge>
                    )}
                  </div>
                </div>
                {w.description && <p className="text-xs text-muted line-clamp-2 mb-2">{w.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{w._count.steps} step &middot; {w._count.submissions} compilazioni</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(w.id) }}
                      className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Duplica wizard"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {!w.isSystem && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(w) }}
                        className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Elimina wizard"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Grid View */}
          {viewMode === 'grid' && (
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWizards.map((w) => (
                <div
                  key={w.id}
                  onClick={() => router.push(`/erp/wizards/${w.id}`)}
                  onMouseEnter={() => setHoveredCard(w.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative rounded-lg border border-border border-t-2 ${CATEGORY_BORDER_COLOR[w.category] || 'border-t-zinc-300 dark:border-t-zinc-600'} bg-card p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Wand2 className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="font-bold text-sm truncate">{w.name}</h3>
                    </div>
                    {w.isSystem && <Badge variant="outline" className="text-[11px] flex-shrink-0">Sistema</Badge>}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted line-clamp-2 mb-3 min-h-[2rem]">
                    {w.description || 'Nessuna descrizione'}
                  </p>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <Badge status={w.status}>
                      {STATUS_LABELS[w.status] || w.status}
                    </Badge>
                    {w.category && (
                      <Badge variant={CATEGORY_BADGE_VARIANT[w.category] || 'outline'}>
                        {CATEGORY_LABELS[w.category] || w.category}
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {w._count.steps} step &middot; {w._count.submissions} compilazioni
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(w.id) }}
                        className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Duplica wizard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {!w.isSystem && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(w) }}
                          className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Elimina wizard"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Preview Tooltip */}
                  {hoveredCard === w.id && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs whitespace-nowrap pointer-events-none">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{w._count.steps} step</span>
                        <span className="text-muted">|</span>
                        <span className="font-medium">{w._count.submissions} compilazioni</span>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Desktop List/Table View */}
          {viewMode === 'list' && (
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted bg-secondary/30">
                    <th className="py-3 pr-4 pl-3 font-medium">Nome</th>
                    <th className="py-3 pr-4 font-medium">Stato</th>
                    <th className="py-3 pr-4 font-medium">Categoria</th>
                    <th className="py-3 pr-4 font-medium text-center">Step</th>
                    <th className="py-3 pr-4 font-medium text-center">Compilazioni</th>
                    <th className="py-3 font-medium hidden lg:table-cell">Creato</th>
                    <th className="py-3 pr-3 font-medium text-right w-20">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWizards.map((w) => (
                    <tr
                      key={w.id}
                      onClick={() => router.push(`/erp/wizards/${w.id}`)}
                      className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 pr-4 pl-3">
                        <span className="font-medium">{w.name}</span>
                        {w.isSystem && <Badge variant="outline" className="ml-2 text-[11px]">Sistema</Badge>}
                        {w.description && <p className="text-xs text-muted truncate max-w-xs">{w.description}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge status={w.status}>
                          {STATUS_LABELS[w.status] || w.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {w.category ? (
                          <Badge variant={CATEGORY_BADGE_VARIANT[w.category] || 'outline'}>
                            {CATEGORY_LABELS[w.category] || w.category}
                          </Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center">{w._count.steps}</td>
                      <td className="py-3 pr-4 text-center">{w._count.submissions}</td>
                      <td className="py-3 text-muted hidden lg:table-cell">
                        {new Date(w.createdAt).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(w.id) }}
                            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Duplica wizard"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {!w.isSystem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(w) }}
                              className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Elimina wizard"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} wizard totali</p>
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

      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Elimina Wizard" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare questo wizard?</p>
        {deleteConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{deleteConfirm.name}</p>
            <p className="text-xs text-muted mt-1">
              {deleteConfirm._count.steps} step &middot; {deleteConfirm._count.submissions} compilazioni
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata. Tutte le compilazioni associate verranno eliminate.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={actionLoading}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
