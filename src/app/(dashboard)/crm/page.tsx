'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Plus, Search, ChevronLeft, ChevronRight, AlertCircle, Download, ChevronDown, Clock, Trash2, Tag, CheckSquare, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'
import { STATUS_OPTIONS, STATUS_LABELS, INDUSTRY_OPTIONS, SOURCE_OPTIONS } from '@/lib/crm-constants'

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  website: string | null
  totalRevenue: string
  tags: string[]
  _count?: { contacts: number; projects: number }
  interactions?: { date: string; type: string }[]
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Oggi'
  if (diffDays === 1) return 'Ieri'
  if (diffDays < 7) return `${diffDays}g fa`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sett. fa`
  return `${Math.floor(diffDays / 30)}m fa`
}

function isNeglected(dateStr: string): boolean {
  const diffMs = new Date().getTime() - new Date(dateStr).getTime()
  return diffMs > 30 * 24 * 60 * 60 * 1000
}

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-600',
  'bg-green-500/10 text-green-600',
  'bg-purple-500/10 text-purple-600',
  'bg-amber-500/10 text-amber-600',
  'bg-pink-500/10 text-pink-600',
  'bg-cyan-500/10 text-cyan-600',
]

export default function CrmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [industryFilter, setIndustryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [neglectedFilter, setNeglectedFilter] = useState(false)
  const [revenueMin, setRevenueMin] = useState('')
  const [revenueMax, setRevenueMax] = useState('')
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const limit = 20

  const clientForm = useFormPersist('new-client', {
    companyName: '',
    vatNumber: '',
    pec: '',
    sdi: '',
    website: '',
    industry: '',
    source: '',
    status: 'LEAD',
    notes: '',
  })

  // Open modal if ?action=new is in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setModalOpen(true)
      router.replace('/crm', { scroll: false })
    }
  }, [searchParams, router])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (industryFilter) params.set('industry', industryFilter)
      if (sourceFilter) params.set('source', sourceFilter)
      if (neglectedFilter) params.set('neglected', 'true')
      if (revenueMin) params.set('revenueMin', revenueMin)
      if (revenueMax) params.set('revenueMax', revenueMax)
      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClients(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei clienti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei clienti')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, industryFilter, sourceFilter, neglectedFilter, revenueMin, revenueMax])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdownId) return
    const handler = () => setStatusDropdownId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [statusDropdownId])

  const totalPages = Math.ceil(total / limit)

  // Duplicate detection (debounced)
  function checkDuplicate(name: string) {
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current)
    if (!name.trim() || name.trim().length < 3) {
      setDuplicateWarning(null)
      return
    }
    duplicateTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(name.trim())}&limit=3`)
        if (res.ok) {
          const data = await res.json()
          const matches = (data.items || []) as Client[]
          if (matches.length > 0) {
            const names = matches.map((m: Client) => m.companyName).join(', ')
            setDuplicateWarning(`Clienti simili trovati: ${names}`)
          } else {
            setDuplicateWarning(null)
          }
        }
      } catch { /* ignore */ }
    }, 500)
  }

  async function handleQuickStatusChange(clientId: string, newStatus: string) {
    setStatusDropdownId(null)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchClients()
    } catch { /* ignore */ }
  }

  function exportCSV() {
    if (clients.length === 0) return
    const rows = [['Ragione Sociale', 'Stato', 'Settore', 'Sito Web', 'Fatturato', 'Contatti', 'Progetti', 'Ultimo Contatto', 'Creato il']]
    for (const c of clients) {
      const lastInteraction = c.interactions?.[0]
      rows.push([
        c.companyName,
        STATUS_LABELS[c.status] || c.status,
        c.industry || '',
        c.website || '',
        c.totalRevenue || '0',
        String(c._count?.contacts || 0),
        String(c._count?.projects || 0),
        lastInteraction ? new Date(lastInteraction.date).toLocaleDateString('it-IT') : 'Mai',
        new Date(c.createdAt).toLocaleDateString('it-IT'),
      ])
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clienti-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, string> = {}
    for (const [k, v] of Object.entries(clientForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        clientForm.reset()
        setModalOpen(false)
        setDuplicateWarning(null)
        fetchClients()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(clients.map(c => c.id)))
    }
  }

  async function executeBulkAction(action: string, value?: unknown) {
    if (selectedIds.size === 0) return
    setBulkSubmitting(true)
    try {
      const res = await fetch('/api/clients/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, value }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        setBulkAction(null)
        setBulkTagInput('')
        fetchClients()
      }
    } finally {
      setBulkSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Clienti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione clienti e relazioni commerciali</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {clients.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Esporta CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Cliente
          </Button>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca clienti, contatti, email, telefono..."
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
        <Button
          variant={filtersOpen || industryFilter || sourceFilter || neglectedFilter || revenueMin || revenueMax ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="h-10"
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Filtri
          {(industryFilter || sourceFilter || neglectedFilter || revenueMin || revenueMax) && (
            <span className="ml-1.5 bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {[industryFilter, sourceFilter, neglectedFilter, revenueMin, revenueMax].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      {filtersOpen && (
        <div className="mb-4 rounded-xl border border-border/30 bg-card/50 p-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Settore"
              options={INDUSTRY_OPTIONS}
              value={industryFilter}
              onChange={(e) => { setIndustryFilter(e.target.value); setPage(1) }}
            />
            <Select
              label="Fonte"
              options={SOURCE_OPTIONS}
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1) }}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Fatturato min (€)</label>
              <Input
                type="number"
                placeholder="0"
                value={revenueMin}
                onChange={(e) => { setRevenueMin(e.target.value); setPage(1) }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Fatturato max (€)</label>
              <Input
                type="number"
                placeholder="∞"
                value={revenueMax}
                onChange={(e) => { setRevenueMax(e.target.value); setPage(1) }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={neglectedFilter}
                onChange={(e) => { setNeglectedFilter(e.target.checked); setPage(1) }}
                className="rounded border-border"
              />
              <span className="text-sm text-muted">Solo clienti trascurati <span className="text-xs">(nessun contatto da 30+ giorni)</span></span>
            </label>
            {(industryFilter || sourceFilter || neglectedFilter || revenueMin || revenueMax) && (
              <button
                onClick={() => {
                  setIndustryFilter('')
                  setSourceFilter('')
                  setNeglectedFilter(false)
                  setRevenueMin('')
                  setRevenueMax('')
                  setPage(1)
                }}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Rimuovi tutti i filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {!filtersOpen && (industryFilter || sourceFilter || neglectedFilter || revenueMin || revenueMax) && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {industryFilter && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Settore: {INDUSTRY_OPTIONS.find(o => o.value === industryFilter)?.label}
              <button onClick={() => setIndustryFilter('')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {sourceFilter && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Fonte: {SOURCE_OPTIONS.find(o => o.value === sourceFilter)?.label}
              <button onClick={() => setSourceFilter('')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {revenueMin && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Min: €{revenueMin}
              <button onClick={() => setRevenueMin('')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {revenueMax && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              Max: €{revenueMax}
              <button onClick={() => setRevenueMax('')}><X className="h-3 w-3" /></button>
            </span>
          )}
          {neglectedFilter && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full">
              Trascurati
              <button onClick={() => setNeglectedFilter(false)}><X className="h-3 w-3" /></button>
            </span>
          )}
          <button
            onClick={() => { setIndustryFilter(''); setSourceFilter(''); setNeglectedFilter(false); setRevenueMin(''); setRevenueMax('') }}
            className="text-xs text-muted hover:text-foreground"
          >
            Rimuovi tutto
          </button>
        </div>
      )}

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchClients()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun cliente trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri di ricerca.' : 'Crea il tuo primo cliente per iniziare.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => {
              const lastInteraction = client.interactions?.[0]
              return (
                <Card
                  key={client.id}
                  className="!p-4 cursor-pointer active:bg-secondary/30 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 touch-manipulation"
                  onClick={() => router.push(`/crm/${client.id}`)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={client.companyName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.companyName}</p>
                      <p className="text-xs text-muted">{client.industry || 'N/D'}</p>
                    </div>
                    <StatusBadge
                      leftLabel={STATUS_LABELS[client.status] || client.status}
                      rightLabel={`${client._count?.projects ?? 0} prog.`}
                      status={client.status}
                    />
                  </div>
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {client.tags.slice(0, 3).map((tag, i) => (
                        <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {lastInteraction ? (
                        <span className={isNeglected(lastInteraction.date) ? 'text-destructive font-medium' : ''}>
                          {timeAgo(lastInteraction.date)}
                        </span>
                      ) : 'Mai contattato'}
                    </span>
                    <span className="font-medium text-foreground">{formatCurrency(client.totalRevenue)}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="hidden md:flex items-center gap-3 mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
              <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{selectedIds.size} selezionat{selectedIds.size === 1 ? 'o' : 'i'}</span>
              <div className="flex items-center gap-2 ml-auto">
                <Select
                  className="w-40 h-8 text-xs"
                  options={[
                    { value: '', label: 'Cambia stato...' },
                    ...STATUS_OPTIONS.filter(o => o.value !== '')
                  ]}
                  value=""
                  onChange={(e) => { if (e.target.value) executeBulkAction('status', e.target.value) }}
                />
                {bulkAction === 'tags' ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={bulkTagInput}
                      onChange={e => setBulkTagInput(e.target.value)}
                      placeholder="Tag da aggiungere..."
                      className="h-8 text-base md:text-xs border border-border rounded-md px-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 w-36"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && bulkTagInput.trim()) {
                          e.preventDefault()
                          executeBulkAction('tags', bulkTagInput.split(',').map(t => t.trim()).filter(Boolean))
                        }
                      }}
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkAction(null)}>Annulla</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkAction('tags')}>
                    <Tag className="h-3 w-3 mr-1" />
                    Aggiungi Tag
                  </Button>
                )}
                {selectedIds.size === 2 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => { const ids = Array.from(selectedIds); router.push(`/crm/merge?source=${ids[0]}&target=${ids[1]}`) }}>
                    <Users className="h-3 w-3 mr-1" /> Unisci
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm(`Eliminare ${selectedIds.size} clienti? Questa azione non può essere annullata.`)) executeBulkAction('delete') }}
                  disabled={bulkSubmitting}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Elimina
                </Button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-muted hover:text-foreground ml-1">Annulla selezione</button>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={clients.length > 0 && selectedIds.size === clients.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Settore</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden xl:table-cell">Ultimo Contatto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Contatti</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Progetti</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const lastInteraction = client.interactions?.[0]
                  return (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/crm/${client.id}`)}
                      className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                    >
                      <td className="px-2 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(client.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(client.id) }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.companyName} size="sm" />
                          <div className="min-w-0">
                            <span className="font-medium block">{client.companyName}</span>
                            {client.tags && client.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-0.5">
                                {client.tags.slice(0, 3).map((tag, i) => (
                                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full leading-tight ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                                    {tag}
                                  </span>
                                ))}
                                {client.tags.length > 3 && (
                                  <span className="text-[10px] text-muted">+{client.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusDropdownId(statusDropdownId === client.id ? null : client.id)
                            }}
                            className="flex items-center gap-1 group/status"
                          >
                            <Badge status={client.status}>
                              {STATUS_LABELS[client.status] || client.status}
                            </Badge>
                            <ChevronDown className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {statusDropdownId === client.id && (
                            <div
                              className="absolute z-50 top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {STATUS_OPTIONS.filter(o => o.value !== '').map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleQuickStatusChange(client.id, opt.value)}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/50 transition-colors ${
                                    client.status === opt.value ? 'font-medium text-primary' : 'text-foreground'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {client.industry || '—'}
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        {lastInteraction ? (
                          <span className={`text-sm ${isNeglected(lastInteraction.date) ? 'text-destructive font-medium' : 'text-muted'}`}>
                            {timeAgo(lastInteraction.date)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted/50">Mai</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-muted tabular-nums">
                        {client._count?.contacts ?? 0}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-muted tabular-nums">
                        {client._count?.projects ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(client.totalRevenue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">
                {total} client{total !== 1 ? 'i' : 'e'} totali
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setDuplicateWarning(null) }} title="Nuovo Cliente" size="lg">
        <form onSubmit={handleCreateClient} className="space-y-4">
          {clientForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={clientForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}
          <div>
            <Input
              label="Ragione Sociale *"
              required
              value={clientForm.values.companyName}
              onChange={(e) => {
                clientForm.setValue('companyName', e.target.value)
                checkDuplicate(e.target.value)
              }}
            />
            {duplicateWarning && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="P.IVA" value={clientForm.values.vatNumber} onChange={(e) => clientForm.setValue('vatNumber', e.target.value)} />
            <Input label="PEC" type="email" value={clientForm.values.pec} onChange={(e) => clientForm.setValue('pec', e.target.value)} />
            <Input label="Codice SDI" value={clientForm.values.sdi} onChange={(e) => clientForm.setValue('sdi', e.target.value)} />
            <Input label="Sito Web" value={clientForm.values.website} onChange={(e) => clientForm.setValue('website', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Settore" options={INDUSTRY_OPTIONS} value={clientForm.values.industry} onChange={(e) => clientForm.setValue('industry', e.target.value)} />
            <Select label="Fonte" options={SOURCE_OPTIONS} value={clientForm.values.source} onChange={(e) => clientForm.setValue('source', e.target.value)} />
          </div>
          <Select
            label="Stato"
            value={clientForm.values.status}
            onChange={(e) => clientForm.setValue('status', e.target.value)}
            options={STATUS_OPTIONS.filter((o) => o.value !== '')}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              rows={3}
              value={clientForm.values.notes}
              onChange={(e) => clientForm.setValue('notes', e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setDuplicateWarning(null) }}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>Crea Cliente</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
