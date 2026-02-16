'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, AlertCircle, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface Expense {
  id: string
  category: string
  description: string
  amount: string
  date: string
  receipt: string | null
  clientId: string | null
  projectId: string | null
  client: { id: string; companyName: string } | null
  project: { id: string; name: string } | null
}

const CATEGORY_LABEL: Record<string, string> = {
  hosting: 'Hosting', software: 'Software', hardware: 'Hardware', dominio: 'Domini',
  marketing: 'Marketing', formazione: 'Formazione', office: 'Ufficio', travel: 'Viaggi',
  meals: 'Pasti', other: 'Altro',
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tutte le categorie' },
  ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
]

const CATEGORY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  hosting: 'default', software: 'success', hardware: 'warning', dominio: 'outline',
  marketing: 'default', formazione: 'success', office: 'outline', travel: 'default',
  meals: 'warning', other: 'outline',
}

const FORM_CATEGORIES = CATEGORY_OPTIONS.filter((o) => o.value !== '')

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
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
      if (categoryFilter) params.set('category', categoryFilter)
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
  }, [fromDate, toDate, categoryFilter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    fetch('/api/clients?limit=200').then(r => r.json()).then(d => setClients(d.items || []))
    fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.items || []))
  }, [])

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.amount) body.amount = parseFloat(body.amount as string)
    if (!body.clientId) body.clientId = null
    if (!body.projectId) body.projectId = null

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Spese</h1>
            <p className="text-xs md:text-sm text-muted">Registrazione e analisi costi</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuova Spesa
          </Button>
        </div>
        <Button onClick={openCreate} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuova
        </Button>
      </div>

      <Link
        href="/erp/expenses/subscriptions"
        className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 text-sm font-medium rounded-lg border border-border/30 hover:bg-secondary/10 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Vai agli Abbonamenti
      </Link>

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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
          label="Categoria"
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchExpenses()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

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
                    <Badge variant={CATEGORY_BADGE[exp.category] || 'default'}>
                      {CATEGORY_LABEL[exp.category] || exp.category}
                    </Badge>
                    {exp.client && <span className="text-xs text-muted">{exp.client.companyName}</span>}
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(exp.amount)}</span>
                </div>
                <p className="text-sm truncate">{exp.description}</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Descrizione</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Importo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                    <td className="px-4 py-3.5">{new Date(exp.date).toLocaleDateString('it-IT')}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={CATEGORY_BADGE[exp.category] || 'default'}>
                        {CATEGORY_LABEL[exp.category] || exp.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{exp.client?.companyName || '\u2014'}</td>
                    <td className="px-4 py-3.5">{exp.description}</td>
                    <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded hover:bg-secondary/20" title="Modifica"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                        <button onClick={() => setDeleteConfirm(exp)} className="p-1.5 rounded hover:bg-secondary/20" title="Elimina"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null) }} title={editItem ? 'Modifica Spesa' : 'Nuova Spesa'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select name="category" label="Categoria *" options={FORM_CATEGORIES} defaultValue={editItem?.category || ''} />
          <Input name="description" label="Descrizione *" required defaultValue={editItem?.description || ''} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="amount" label="Importo (EUR) *" type="number" step="0.01" min="0" required defaultValue={editItem?.amount || ''} />
            <Input name="date" label="Data *" type="date" required defaultValue={editItem?.date?.split('T')[0] || ''} />
          </div>
          <Input name="receipt" label="URL Ricevuta" placeholder="https://..." defaultValue={editItem?.receipt || ''} />
          <Select name="clientId" label="Cliente" options={[{ value: '', label: 'Nessun cliente' }, ...clients.map(c => ({ value: c.id, label: c.companyName }))]} defaultValue={editItem?.clientId || ''} />
          <Select name="projectId" label="Progetto" options={[{ value: '', label: 'Nessun progetto' }, ...projects.map(p => ({ value: p.id, label: p.name }))]} defaultValue={editItem?.projectId || ''} />
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
              {CATEGORY_LABEL[deleteConfirm.category] || deleteConfirm.category} &middot; {formatCurrency(deleteConfirm.amount)} &middot; {new Date(deleteConfirm.date).toLocaleDateString('it-IT')}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
