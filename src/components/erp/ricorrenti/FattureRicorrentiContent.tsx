'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileCheck, Plus, AlertCircle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface BankAccount { id: string; name: string }
interface BusinessEntity { id: string; name: string }

interface RecurringInvoice {
  id: string
  description: string
  category: string
  supplierName: string | null
  amount: string
  frequency: string
  firstDate: string
  lastPaidDate: string | null
  nextDueDate: string | null
  totalPaid: string
  totalDue: string
  isActive: boolean
  notes: string | null
  bankAccountId: string | null
  businessEntityId: string | null
  bankAccount: { id: string; name: string } | null
  businessEntity: { id: string; name: string } | null
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Settimanale',
  monthly: 'Mensile',
  quarterly: 'Trimestrale',
  yearly: 'Annuale',
}

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: 'bg-purple-500/10 text-purple-600',
  monthly: 'bg-blue-500/10 text-blue-600',
  quarterly: 'bg-amber-500/10 text-amber-600',
  yearly: 'bg-emerald-500/10 text-emerald-600',
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tutte' },
  { value: 'true', label: 'Attive' },
  { value: 'false', label: 'Sospese' },
]

const FREQUENCY_FILTER_OPTIONS = [
  { value: '', label: 'Tutte le frequenze' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'yearly', label: 'Annuale' },
]

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'quarterly', label: 'Trimestrale' },
  { value: 'yearly', label: 'Annuale' },
]

function getInvoiceStatus(inv: RecurringInvoice): { label: string; color: string } {
  if (!inv.isActive) return { label: 'Sospesa', color: 'bg-gray-500/10 text-gray-500' }
  if (!inv.nextDueDate) return { label: 'Attiva', color: 'bg-emerald-500/10 text-emerald-600' }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(inv.nextDueDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return { label: 'Scaduta', color: 'bg-red-500/10 text-red-500' }
  if (diffDays <= 7) return { label: 'In scadenza', color: 'bg-amber-500/10 text-amber-600' }
  return { label: 'Attiva', color: 'bg-emerald-500/10 text-emerald-600' }
}

export function FattureRicorrentiContent() {
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<RecurringInvoice | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<RecurringInvoice | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('isActive', statusFilter)
      if (frequencyFilter) params.set('frequency', frequencyFilter)
      const res = await fetch(`/api/recurring-invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.items || [])
      } else {
        setFetchError('Errore nel caricamento delle fatture ricorrenti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, frequencyFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  useEffect(() => {
    fetch('/api/bank-accounts').then(r => r.json()).then(d => setBankAccounts(d.items || []))
    fetch('/api/business-entities').then(r => r.json()).then(d => setBusinessEntities(d.items || []))
    fetch('/api/accounting-categories?type=expense').then(r => r.json()).then(d => setCategories(d.items || []))
  }, [])

  // Summary calculations
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const activeInvoices = invoices.filter(i => i.isActive)
  const dueThisMonth = activeInvoices.filter(i => {
    if (!i.nextDueDate) return false
    const d = new Date(i.nextDueDate)
    return d >= now && d <= thisMonthEnd
  })
  const overdue = activeInvoices.filter(i => {
    if (!i.nextDueDate) return false
    return new Date(i.nextDueDate) < now
  })
  const dueSoon = activeInvoices.filter(i => {
    if (!i.nextDueDate) return false
    const d = new Date(i.nextDueDate)
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })

  const totalDueThisMonth = dueThisMonth.reduce((s, i) => s + parseFloat(i.amount), 0)

  const formBankAccountOptions = [
    { value: '', label: 'Nessun conto' },
    ...bankAccounts.map(b => ({ value: b.id, label: b.name })),
  ]

  const formBusinessEntityOptions = [
    { value: '', label: 'Nessuna attivita' },
    ...businessEntities.map(b => ({ value: b.id, label: b.name })),
  ]

  const formCategoryOptions = [
    { value: '', label: 'Seleziona categoria' },
    ...categories.map(c => ({ value: c.name, label: c.name })),
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      description: (form.get('description') as string || '').trim(),
      category: (form.get('category') as string || '').trim(),
      supplierName: (form.get('supplierName') as string || '').trim() || null,
      amount: parseFloat(form.get('amount') as string || '0'),
      frequency: form.get('frequency') as string,
      firstDate: form.get('firstDate') as string,
      nextDueDate: (form.get('nextDueDate') as string) || (form.get('firstDate') as string),
      isActive: form.get('isActive') === 'on',
      notes: (form.get('notes') as string || '').trim() || null,
      bankAccountId: (form.get('bankAccountId') as string || '').trim() || null,
      businessEntityId: (form.get('businessEntityId') as string || '').trim() || null,
    }

    try {
      const url = editItem ? `/api/recurring-invoices/${editItem.id}` : '/api/recurring-invoices'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        setEditItem(null)
        fetchInvoices()
      } else {
        setFormError(editItem ? 'Errore nella modifica' : 'Errore nella creazione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/recurring-invoices/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchInvoices()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(inv: RecurringInvoice) {
    setEditItem(inv)
    setFormError(null)
    setModalOpen(true)
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
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuova Fattura
          </Button>
        </div>
        <Button onClick={openCreate} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuova
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="!p-3 md:!p-4">
            <p className="text-xs text-muted mb-1">Da pagare questo mese</p>
            <p className="text-lg md:text-xl font-bold text-blue-600 tabular-nums">{formatCurrency(totalDueThisMonth)}</p>
            <p className="text-xs text-muted mt-0.5">{dueThisMonth.length} fatture</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 md:!p-4">
            <p className="text-xs text-muted mb-1">Scadute</p>
            <p className="text-lg md:text-xl font-bold text-red-500 tabular-nums">{overdue.length}</p>
            <p className="text-xs text-muted mt-0.5">da pagare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 md:!p-4">
            <p className="text-xs text-muted mb-1">In scadenza (7gg)</p>
            <p className="text-lg md:text-xl font-bold text-amber-600 tabular-nums">{dueSoon.length}</p>
            <p className="text-xs text-muted mt-0.5">prossime scadenze</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select
          label="Stato"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          label="Frequenza"
          options={FREQUENCY_FILTER_OPTIONS}
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchInvoices()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="Nessuna fattura ricorrente"
          description="Aggiungi le fatture ricorrenti per monitorare le scadenze."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Fattura
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {invoices.map((inv) => {
              const status = getInvoiceStatus(inv)
              return (
                <div key={inv.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${FREQUENCY_COLORS[inv.frequency] || ''}`}>
                        {FREQUENCY_LABELS[inv.frequency] || inv.frequency}
                      </span>
                    </div>
                    <span className="font-bold text-sm tabular-nums">{formatCurrency(inv.amount)}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{inv.description}</p>
                  {inv.supplierName && <p className="text-xs text-muted truncate">{inv.supplierName}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-xs text-muted">
                      {inv.nextDueDate ? `Scade: ${new Date(inv.nextDueDate).toLocaleDateString('it-IT')}` : 'Nessuna scadenza'}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(inv)} className="p-1 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                      <button onClick={() => setDeleteConfirm(inv)} className="p-1 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Descrizione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Fornitore</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Importo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Frequenza</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Ultimo Pag.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Prossima Scad.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const status = getInvoiceStatus(inv)
                  return (
                    <tr key={inv.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-medium">{inv.description}</span>
                          {inv.bankAccount && <p className="text-xs text-muted">{inv.bankAccount.name}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">{inv.supplierName || '\u2014'}</td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${FREQUENCY_COLORS[inv.frequency] || ''}`}>
                          {FREQUENCY_LABELS[inv.frequency] || inv.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {inv.lastPaidDate ? new Date(inv.lastPaidDate).toLocaleDateString('it-IT') : '\u2014'}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {inv.nextDueDate ? new Date(inv.nextDueDate).toLocaleDateString('it-IT') : '\u2014'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(inv)} className="p-1.5 rounded hover:bg-secondary/20" title="Modifica"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                          <button onClick={() => setDeleteConfirm(inv)} className="p-1.5 rounded hover:bg-secondary/20" title="Elimina"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Crea/Modifica */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }} title={editItem ? 'Modifica Fattura Ricorrente' : 'Nuova Fattura Ricorrente'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editItem?.isActive ?? true}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium">Attiva</span>
          </label>
          <Input name="description" label="Descrizione *" required defaultValue={editItem?.description || ''} />
          <Input name="supplierName" label="Fornitore" defaultValue={editItem?.supplierName || ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select name="category" label="Categoria *" options={formCategoryOptions} defaultValue={editItem?.category || ''} />
            <Select name="frequency" label="Frequenza *" options={FREQUENCY_OPTIONS} defaultValue={editItem?.frequency || 'monthly'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="amount" label="Importo (EUR) *" type="number" step="0.01" min="0" required defaultValue={editItem?.amount || ''} />
            <Input name="firstDate" label="Data Inizio *" type="date" required defaultValue={editItem?.firstDate?.split('T')[0] || ''} />
            <Input name="nextDueDate" label="Prossima Scadenza" type="date" defaultValue={editItem?.nextDueDate?.split('T')[0] || ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select name="bankAccountId" label="Conto Bancario" options={formBankAccountOptions} defaultValue={editItem?.bankAccountId || ''} />
            <Select name="businessEntityId" label="Attivita" options={formBusinessEntityOptions} defaultValue={editItem?.businessEntityId || ''} />
          </div>
          <Input name="notes" label="Note" defaultValue={editItem?.notes || ''} />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditItem(null) }}>Annulla</Button>
            <Button type="submit" loading={submitting}>{editItem ? 'Salva Modifiche' : 'Aggiungi Fattura'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Elimina Fattura Ricorrente" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare questa fattura ricorrente?</p>
        {deleteConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{deleteConfirm.description}</p>
            <p className="text-xs text-muted mt-1">
              {deleteConfirm.supplierName || deleteConfirm.category} &middot; {formatCurrency(deleteConfirm.amount)} &middot; {FREQUENCY_LABELS[deleteConfirm.frequency] || deleteConfirm.frequency}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non puo essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
