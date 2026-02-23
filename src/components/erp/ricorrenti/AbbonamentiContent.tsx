'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Plus, AlertCircle, Pause, Play, X, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { useTableSort, sortData } from '@/hooks/useTableSort'

interface Subscription {
  id: string
  category: string
  description: string
  amount: string
  date: string
  frequency: string
  nextDueDate: string | null
  endDate: string | null
  autoRenew: boolean
  status: string
  provider: string | null
  notes: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  hosting: 'Hosting', software: 'Software', hardware: 'Hardware', dominio: 'Domini',
  marketing: 'Marketing', formazione: 'Formazione', office: 'Ufficio', travel: 'Viaggi',
  meals: 'Pasti', other: 'Altro',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'Mensile', quarterly: 'Trimestrale', yearly: 'Annuale', custom: 'Personalizzato',
}

const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABEL).map(([value, label]) => ({ value, label }))

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  active: 'success', paused: 'warning', cancelled: 'outline', expired: 'destructive',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo', paused: 'In pausa', cancelled: 'Cancellato', expired: 'Scaduto',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    default: return amount
  }
}

export function AbbonamentiContent() {
  const [items, setItems] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Subscription | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Subscription | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/expenses/subscriptions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      } else {
        setFetchError('Errore nel caricamento degli abbonamenti')
      }
    } catch {
      setFetchError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const { sortKey, sortDir, handleSort, sortIcon } = useTableSort('nextDueDate', 'asc')

  const sortedItems = useMemo(
    () => sortData(items, sortKey, sortDir),
    [items, sortKey, sortDir]
  )

  const activeItems = items.filter(i => i.status === 'active')
  const totalMonthly = activeItems.reduce(
    (s, i) => s + monthlyEquivalent(parseFloat(i.amount), i.frequency),
    0
  )
  const upcomingCount = activeItems.filter(i => {
    if (!i.nextDueDate) return false
    const diff = new Date(i.nextDueDate).getTime() - Date.now()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => { if (typeof v === 'string' && v.trim()) body[k] = v.trim() })
    if (body.amount) body.amount = parseFloat(body.amount as string)

    if (editItem) {
      try {
        const res = await fetch(`/api/expenses/subscriptions/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          setEditItem(null)
          setModalOpen(false)
          fetchData()
        } else {
          setFormError('Errore nella modifica')
        }
      } catch {
        setFormError('Errore di rete')
      } finally {
        setSubmitting(false)
      }
    } else {
      body.isRecurring = true
      body.date = body.nextDueDate
      try {
        const res = await fetch('/api/expenses/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          setModalOpen(false)
          fetchData()
        } else {
          setFormError('Errore nella creazione')
        }
      } catch {
        setFormError('Errore di rete')
      } finally {
        setSubmitting(false)
      }
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/expenses/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  function openEdit(sub: Subscription) {
    setEditItem(sub)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/expenses/subscriptions/${deleteConfirm.id}?permanent=true`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchData()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setFormError(null)
    setModalOpen(true)
  }

  return (
    <div>
      {/* Action Button */}
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openCreate} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nuovo Abbonamento</span>
          <span className="sm:hidden">Nuovo</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-green-500/10 text-green-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Attivi</p>
              <p className="text-lg font-bold">{activeItems.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Costo Mensile</p>
              <p className="text-lg font-bold">{formatCurrency(totalMonthly)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Scadenza 7gg</p>
              <p className="text-lg font-bold">{upcomingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select
          label="Stato"
          options={STATUS_FILTER_OPTIONS}
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
          <button onClick={fetchData} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nessun abbonamento"
          description="Aggiungi i tuoi abbonamenti per tracciare le spese ricorrenti."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Abbonamento
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {items.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE[sub.status] || 'outline'}>{STATUS_LABEL[sub.status] || sub.status}</Badge>
                    <Badge variant="outline">{FREQUENCY_LABEL[sub.frequency] || sub.frequency}</Badge>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(sub.amount)}</span>
                </div>
                <p className="text-sm font-medium">{sub.provider || sub.description}</p>
                {sub.provider && <p className="text-xs text-muted truncate">{sub.description}</p>}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted">
                    {sub.nextDueDate ? `Scadenza: ${new Date(sub.nextDueDate).toLocaleDateString('it-IT')}` : 'Nessuna scadenza'}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(sub)} className="p-1 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                    {sub.status === 'active' && (
                      <button onClick={() => updateStatus(sub.id, 'paused')} className="p-1 rounded hover:bg-secondary/20"><Pause className="h-3.5 w-3.5 text-amber-500" /></button>
                    )}
                    {sub.status === 'paused' && (
                      <button onClick={() => updateStatus(sub.id, 'active')} className="p-1 rounded hover:bg-secondary/20"><Play className="h-3.5 w-3.5 text-green-500" /></button>
                    )}
                    {sub.status !== 'cancelled' && (
                      <button onClick={() => updateStatus(sub.id, 'cancelled')} className="p-1 rounded hover:bg-secondary/20"><X className="h-3.5 w-3.5 text-amber-600" /></button>
                    )}
                    <button onClick={() => setDeleteConfirm(sub)} className="p-1 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('provider')}>Provider{sortIcon('provider')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('category')}>Categoria{sortIcon('category')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('frequency')}>Frequenza{sortIcon('frequency')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('amount')}>Importo{sortIcon('amount')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('nextDueDate')}>Prossima Scadenza{sortIcon('nextDueDate')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('status')}>Stato{sortIcon('status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((sub) => (
                  <tr key={sub.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium">{sub.provider || sub.description}</p>
                        {sub.provider && <p className="text-xs text-muted truncate max-w-[200px]">{sub.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline">{CATEGORY_LABEL[sub.category] || sub.category}</Badge>
                    </td>
                    <td className="px-4 py-3.5">{FREQUENCY_LABEL[sub.frequency] || sub.frequency}</td>
                    <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(sub.amount)}</td>
                    <td className="px-4 py-3.5">
                      {sub.nextDueDate ? new Date(sub.nextDueDate).toLocaleDateString('it-IT') : '\u2014'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={STATUS_BADGE[sub.status] || 'outline'}>{STATUS_LABEL[sub.status] || sub.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(sub)} className="p-1.5 rounded hover:bg-secondary/20" title="Modifica"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                        {sub.status === 'active' && (
                          <button onClick={() => updateStatus(sub.id, 'paused')} className="p-1.5 rounded hover:bg-secondary/20" title="Pausa"><Pause className="h-3.5 w-3.5 text-amber-500" /></button>
                        )}
                        {sub.status === 'paused' && (
                          <button onClick={() => updateStatus(sub.id, 'active')} className="p-1.5 rounded hover:bg-secondary/20" title="Riattiva"><Play className="h-3.5 w-3.5 text-green-500" /></button>
                        )}
                        {sub.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(sub.id, 'cancelled')} className="p-1.5 rounded hover:bg-secondary/20" title="Disdici"><X className="h-3.5 w-3.5 text-amber-600" /></button>
                        )}
                        <button onClick={() => setDeleteConfirm(sub)} className="p-1.5 rounded hover:bg-secondary/20" title="Elimina"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Crea/Modifica */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }} title={editItem ? 'Modifica Abbonamento' : 'Nuovo Abbonamento'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="provider" label="Provider" placeholder="es. Vercel, Hostinger, Adobe" defaultValue={editItem?.provider || ''} />
          <Select name="category" label="Categoria *" options={CATEGORY_OPTIONS} defaultValue={editItem?.category || ''} />
          <Input name="description" label="Descrizione *" required defaultValue={editItem?.description || ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="amount" label="Importo (EUR) *" type="number" step="0.01" min="0" required defaultValue={editItem?.amount || ''} />
            <Select name="frequency" label="Frequenza *" options={FREQUENCY_OPTIONS} defaultValue={editItem?.frequency || 'monthly'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="nextDueDate" label="Prossima Scadenza *" type="date" required defaultValue={editItem?.nextDueDate?.split('T')[0] || ''} />
            <Input name="endDate" label="Data Fine (opzionale)" type="date" defaultValue={editItem?.endDate?.split('T')[0] || ''} />
          </div>
          <Input name="notes" label="Note" placeholder="Note aggiuntive..." defaultValue={editItem?.notes || ''} />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditItem(null) }}>Annulla</Button>
            <Button type="submit" loading={submitting}>{editItem ? 'Salva' : 'Crea Abbonamento'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Elimina Abbonamento" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare definitivamente questo abbonamento?</p>
        {deleteConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{deleteConfirm.provider || deleteConfirm.description}</p>
            <p className="text-xs text-muted mt-1">
              {CATEGORY_LABEL[deleteConfirm.category] || deleteConfirm.category} &middot; {formatCurrency(deleteConfirm.amount)} &middot; {FREQUENCY_LABEL[deleteConfirm.frequency] || deleteConfirm.frequency}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata. L&apos;abbonamento e tutto lo storico verranno eliminati.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
