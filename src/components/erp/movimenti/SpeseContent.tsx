'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, AlertCircle, Pencil, Trash2, Eye, EyeOff, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { generateCSV, downloadCSV } from '@/lib/export-csv'

interface BankAccount {
  id: string
  name: string
}

interface BusinessEntity {
  id: string
  name: string
}

interface AccountingCategory {
  id: string
  name: string
}

interface Expense {
  id: string
  isPaid: boolean
  supplierName: string
  description: string
  date: string
  category: string
  amount: string
  vatRate: number
  deductibility: number
  netAmount: string | null
  vatDeductible: string | null
  receipt: string | null
  invoiceNumber: string | null
  dueDate: string | null
  paymentMethod: string | null
  notes: string | null
  clientId: string | null
  projectId: string | null
  bankAccountId: string | null
  businessEntityId: string | null
  bankAccount: { id: string; name: string } | null
  businessEntity: { id: string; name: string } | null
  client: { id: string; companyName: string } | null
  project: { id: string; name: string } | null
}

interface VatRateOption { value: string; label: string }

const DEDUCTIBILITY_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '50', label: '50%' },
  { value: '100', label: '100%' },
]

const PAYMENT_FILTER_OPTIONS = [
  { value: '', label: 'Tutte' },
  { value: 'paid', label: 'Pagate' },
  { value: 'unpaid', label: 'Non pagate' },
]

export function SpeseContent() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([])
  const [categories, setCategories] = useState<AccountingCategory[]>([])
  const [vatOptions, setVatOptions] = useState<VatRateOption[]>([{ value: '22', label: '22%' }])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [bankAccountFilter, setBankAccountFilter] = useState('')
  const [businessEntityFilter, setBusinessEntityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [recurringFilter, setRecurringFilter] = useState('')
  const [advancedView, setAdvancedView] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (paymentFilter === 'paid') params.set('isPaid', 'true')
      if (paymentFilter === 'unpaid') params.set('isPaid', 'false')
      if (bankAccountFilter) params.set('bankAccountId', bankAccountFilter)
      if (businessEntityFilter) params.set('businessEntityId', businessEntityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (clientFilter) params.set('clientId', clientFilter)
      if (projectFilter) params.set('projectId', projectFilter)
      if (recurringFilter === 'true') params.set('recurring', 'true')
      if (recurringFilter === 'false') params.set('recurring', 'false')
      const res = await fetch(`/api/expenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.items || [])
      } else {
        setFetchError('Errore nel caricamento delle spese')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle spese')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, paymentFilter, bankAccountFilter, businessEntityFilter, categoryFilter, clientFilter, projectFilter, recurringFilter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    fetch('/api/clients?limit=200').then(r => r.json()).then(d => setClients(d.items || []))
    fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.items || []))
    fetch('/api/bank-accounts').then(r => r.json()).then(d => setBankAccounts(d.items || []))
    fetch('/api/business-entities').then(r => r.json()).then(d => setBusinessEntities(d.items || []))
    fetch('/api/accounting-categories?type=expense').then(r => r.json()).then(d => setCategories(d.items || []))
    fetch('/api/vat-rates').then(r => r.json()).then(d => {
      const items = d.items || []
      if (items.length > 0) {
        setVatOptions(items.map((v: { code: string; label: string }) => ({ value: v.code, label: v.label })))
      }
    })
  }, [])

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  function computeNet(amount: string, vatRate: number) {
    const gross = parseFloat(amount)
    if (!vatRate) return gross
    return gross / (1 + vatRate / 100)
  }

  function computeVat(amount: string, vatRate: number) {
    const gross = parseFloat(amount)
    if (!vatRate) return 0
    return gross - gross / (1 + vatRate / 100)
  }

  function computeDeductibleVat(amount: string, vatRate: number, deductibility: number) {
    return computeVat(amount, vatRate) * (deductibility / 100)
  }

  const bankAccountOptions = [
    { value: '', label: 'Tutti i conti' },
    ...bankAccounts.map(b => ({ value: b.id, label: b.name })),
  ]

  const businessEntityOptions = [
    { value: '', label: 'Tutte le attività' },
    ...businessEntities.map(b => ({ value: b.id, label: b.name })),
  ]

  const categoryOptions = [
    { value: '', label: 'Tutte le categorie' },
    ...categories.map(c => ({ value: c.name, label: c.name })),
  ]

  const formBankAccountOptions = [
    { value: '', label: 'Seleziona conto' },
    ...bankAccounts.map(b => ({ value: b.id, label: b.name })),
  ]

  const formBusinessEntityOptions = [
    { value: '', label: 'Seleziona attività' },
    ...businessEntities.map(b => ({ value: b.id, label: b.name })),
  ]

  const formCategoryOptions = [
    { value: '', label: 'Seleziona categoria' },
    ...categories.map(c => ({ value: c.name, label: c.name })),
  ]

  const formClientOptions = [
    { value: '', label: 'Nessun cliente' },
    ...clients.map(c => ({ value: c.id, label: c.companyName })),
  ]

  const formProjectOptions = [
    { value: '', label: 'Nessun progetto' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}

    body.isPaid = form.get('isPaid') === 'on'
    body.supplierName = (form.get('supplierName') as string || '').trim()
    body.description = (form.get('description') as string || '').trim()
    body.date = (form.get('date') as string || '').trim()
    body.category = (form.get('category') as string || '').trim()
    body.amount = parseFloat(form.get('amount') as string || '0')
    body.vatRate = (form.get('vatRate') as string || '22').trim()
    body.deductibility = (form.get('deductibility') as string || '100').trim()
    body.invoiceNumber = (form.get('invoiceNumber') as string || '').trim() || null
    body.dueDate = (form.get('dueDate') as string || '').trim() || null
    body.paymentMethod = (form.get('paymentMethod') as string || '').trim() || null
    body.notes = (form.get('notes') as string || '').trim() || null
    body.receipt = (form.get('receipt') as string || '').trim() || null

    const bankId = (form.get('bankAccountId') as string || '').trim()
    body.bankAccountId = bankId || null

    const bizId = (form.get('businessEntityId') as string || '').trim()
    body.businessEntityId = bizId || null

    const cId = (form.get('clientId') as string || '').trim()
    body.clientId = cId || null

    const pId = (form.get('projectId') as string || '').trim()
    body.projectId = pId || null

    try {
      const url = editItem ? `/api/expenses/${editItem.id}` : '/api/expenses'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFormError(null)
        setModalOpen(false)
        setEditItem(null)
        fetchExpenses()
      } else {
        setFormError(editItem ? 'Errore nella modifica della spesa' : 'Errore nella creazione della spesa')
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
      const res = await fetch(`/api/expenses/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchExpenses()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(exp: Expense) {
    setEditItem(exp)
    setFormError(null)
    setModalOpen(true)
  }

  function openCreate() {
    setEditItem(null)
    setFormError(null)
    setModalOpen(true)
  }

  function handleExportCSV() {
    const headers = ['Data', 'N. Fattura', 'Fornitore', 'Descrizione', 'Categoria', 'Importo', 'IVA %', 'Deducibilita %', 'Pagata', 'Scadenza', 'Metodo Pagamento', 'Conto', 'Note']
    const rows = expenses.map((e) => [
      new Date(e.date).toLocaleDateString('it-IT'),
      e.invoiceNumber || '',
      e.supplierName || '',
      e.description,
      e.category,
      parseFloat(e.amount).toFixed(2),
      String(e.vatRate || ''),
      String(e.deductibility || ''),
      e.isPaid ? 'Si' : 'No',
      e.dueDate ? new Date(e.dueDate).toLocaleDateString('it-IT') : '',
      e.paymentMethod || '',
      e.bankAccount?.name || '',
      e.notes || '',
    ])
    const csv = generateCSV(headers, rows)
    downloadCSV(`spese_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0} className="hidden sm:flex">
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0} className="sm:hidden">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={openCreate} className="hidden sm:flex">
          <Plus className="h-4 w-4" />
          Nuova Spesa
        </Button>
        <Button onClick={openCreate} className="sm:hidden">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-secondary text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted">Totale Spese</p>
            <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <Select
          label="Stato pagamento"
          options={PAYMENT_FILTER_OPTIONS}
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          label="Dal"
          className="w-full sm:w-44"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          label="Al"
          className="w-full sm:w-44"
        />
        <Select
          label="Conto bancario"
          options={bankAccountOptions}
          value={bankAccountFilter}
          onChange={(e) => setBankAccountFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          label="Attività"
          options={businessEntityOptions}
          value={businessEntityFilter}
          onChange={(e) => setBusinessEntityFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          label="Categoria"
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          label="Cliente"
          options={[{ value: '', label: 'Tutti i clienti' }, ...clients.map(c => ({ value: c.id, label: c.companyName }))]}
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          label="Progetto"
          options={[{ value: '', label: 'Tutti i progetti' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          label="Tipo"
          options={[
            { value: '', label: 'Tutte' },
            { value: 'true', label: 'Ricorrenti' },
            { value: 'false', label: 'Una tantum' },
          ]}
          value={recurringFilter}
          onChange={(e) => setRecurringFilter(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Advanced View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setAdvancedView(!advancedView)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border/30 hover:bg-secondary/10 transition-colors"
        >
          {advancedView ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          Vista Avanzata
        </button>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchExpenses()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nessuna spesa trovata"
          description="Registra le spese per tenere traccia dei costi."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Spesa
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${exp.isPaid ? 'bg-green-500' : 'bg-red-500'}`}
                      title={exp.isPaid ? 'Pagata' : 'Non pagata'}
                    />
                    <Badge variant="default">{exp.category}</Badge>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(exp.amount)}</span>
                </div>
                <p className="text-sm font-medium truncate">{exp.description}</p>
                {exp.supplierName && <p className="text-xs text-muted truncate">{exp.supplierName}</p>}
                {exp.notes && <p className="text-xs text-muted truncate mt-0.5">{exp.notes}</p>}
                {advancedView && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {exp.bankAccount && <span>Conto: {exp.bankAccount.name}</span>}
                    {exp.businessEntity && <span>Attività: {exp.businessEntity.name}</span>}
                    <span>IVA: {exp.vatRate}%</span>
                    <span>Deduc.: {exp.deductibility ?? 100}%</span>
                    <span>Netto: {formatCurrency(computeNet(exp.amount, exp.vatRate))}</span>
                    <span>IVA Detr.: {formatCurrency(computeDeductibleVat(exp.amount, exp.vatRate, exp.deductibility ?? 100))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted">
                    {new Date(exp.date).toLocaleDateString('it-IT')}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(exp)} className="p-1 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                    <button onClick={() => setDeleteConfirm(exp)} className="p-1 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Pagato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Descrizione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Fornitore</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Categoria</th>
                  {advancedView && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Conto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Attività</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">IVA%</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Deduc.%</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Netto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">IVA Detr.</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Importo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Note</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                    <td className="px-4 py-3.5">{new Date(exp.date).toLocaleDateString('it-IT')}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${exp.isPaid ? 'bg-green-500' : 'bg-red-500'}`}
                        title={exp.isPaid ? 'Pagata' : 'Non pagata'}
                      />
                    </td>
                    <td className="px-4 py-3.5 font-medium max-w-[250px] truncate">{exp.description}</td>
                    <td className="px-4 py-3.5">{exp.supplierName || '\u2014'}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant="default">{exp.category}</Badge>
                    </td>
                    {advancedView && (
                      <>
                        <td className="px-4 py-3.5 text-muted">{exp.bankAccount?.name || '\u2014'}</td>
                        <td className="px-4 py-3.5 text-muted">{exp.businessEntity?.name || '\u2014'}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{exp.vatRate}%</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{exp.deductibility ?? 100}%</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(computeNet(exp.amount, exp.vatRate))}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(computeDeductibleVat(exp.amount, exp.vatRate, exp.deductibility ?? 100))}</td>
                      </>
                    )}
                    <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3.5 text-muted max-w-[200px] truncate">{exp.notes || '\u2014'}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded hover:bg-secondary/20" title="Modifica"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                        <button onClick={() => setDeleteConfirm(exp)} className="p-1.5 rounded hover:bg-secondary/20" title="Elimina"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/30 bg-secondary/5 font-semibold">
                  <td className="px-4 py-3" colSpan={advancedView ? 4 : 4}>Totale</td>
                  {advancedView && (
                    <>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(expenses.reduce((s, e) => s + computeNet(e.amount, e.vatRate), 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(expenses.reduce((s, e) => s + computeDeductibleVat(e.amount, e.vatRate, e.deductibility ?? 100), 0))}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalAmount)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Modal Crea/Modifica */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }} title={editItem ? 'Modifica Spesa' : 'Nuova Spesa'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isPaid"
              defaultChecked={editItem?.isPaid ?? true}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium">Pagata</span>
          </label>
          <Input name="supplierName" label="Nome Fornitore" defaultValue={editItem?.supplierName || ''} />
          <Input name="description" label="Descrizione *" required defaultValue={editItem?.description || ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="date" label="Data *" type="date" required defaultValue={editItem?.date?.split('T')[0] || ''} />
            <Select name="category" label="Categoria *" options={formCategoryOptions} defaultValue={editItem?.category || ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="amount" label="Importo (EUR) *" type="number" step="0.01" min="0" required defaultValue={editItem?.amount || ''} />
            <Select name="vatRate" label="Aliquota IVA" options={vatOptions} defaultValue={String(editItem?.vatRate ?? '22')} />
            <Select name="deductibility" label="Deducibilità" options={DEDUCTIBILITY_OPTIONS} defaultValue={String(editItem?.deductibility ?? 100)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select name="bankAccountId" label="Conto Bancario" options={formBankAccountOptions} defaultValue={editItem?.bankAccountId || ''} />
            <Select name="businessEntityId" label="Attività" options={formBusinessEntityOptions} defaultValue={editItem?.businessEntityId || ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="invoiceNumber" label="N° Fattura Fornitore" placeholder="FA-2026/123" defaultValue={editItem?.invoiceNumber || ''} />
            <Input name="dueDate" label="Scadenza" type="date" defaultValue={editItem?.dueDate?.split('T')[0] || ''} />
            <Select name="paymentMethod" label="Metodo Pagamento" options={[
              { value: '', label: 'Seleziona' },
              { value: 'bonifico', label: 'Bonifico' },
              { value: 'contanti', label: 'Contanti' },
              { value: 'carta', label: 'Carta' },
              { value: 'assegno', label: 'Assegno' },
              { value: 'riba', label: 'Ri.Ba' },
              { value: 'altro', label: 'Altro' },
            ]} defaultValue={editItem?.paymentMethod || ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select name="clientId" label="Cliente" options={formClientOptions} defaultValue={editItem?.clientId || ''} />
            <Select name="projectId" label="Progetto" options={formProjectOptions} defaultValue={editItem?.projectId || ''} />
          </div>
          <Input name="receipt" label="URL Ricevuta" placeholder="https://..." defaultValue={editItem?.receipt || ''} />
          <Input name="notes" label="Note" defaultValue={editItem?.notes || ''} />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditItem(null) }}>Annulla</Button>
            <Button type="submit" loading={submitting}>{editItem ? 'Salva Modifiche' : 'Aggiungi Spesa'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Elimina Spesa" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare questa spesa?</p>
        {deleteConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{deleteConfirm.description}</p>
            <p className="text-xs text-muted mt-1">
              {deleteConfirm.category} &middot; {formatCurrency(deleteConfirm.amount)} &middot; {new Date(deleteConfirm.date).toLocaleDateString('it-IT')}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
        </div>
      </Modal>
    </>
  )
}
