'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MorphButton } from '@/components/ui/MorphButton'
import { MicroExpander } from '@/components/ui/MicroExpander'
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
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/expenses?${params}`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, categoryFilter])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.amount) body.amount = parseFloat(body.amount as string)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchExpenses()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0" style={{ background: 'var(--gold-gradient)' }}>
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Spese</h1>
            <p className="text-xs md:text-sm text-muted">Registrazione e analisi costi</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <MicroExpander
            text="Nuova Spesa"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          />
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuova
        </Button>
      </div>

      <Card className="mb-6 shadow-lift">
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
            <Button onClick={() => setModalOpen(true)}>
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
                  <Badge variant={CATEGORY_BADGE[exp.category] || 'default'}>
                    {CATEGORY_LABEL[exp.category] || exp.category}
                  </Badge>
                  <span className="font-bold text-sm">{formatCurrency(exp.amount)}</span>
                </div>
                <p className="text-sm truncate">{exp.description}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(exp.date).toLocaleDateString('it-IT')}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Data</th>
                  <th className="py-3 pr-4 font-medium">Categoria</th>
                  <th className="py-3 pr-4 font-medium">Descrizione</th>
                  <th className="py-3 font-medium text-right">Importo</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 transition-colors">
                    <td className="py-3 pr-4">{new Date(exp.date).toLocaleDateString('it-IT')}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={CATEGORY_BADGE[exp.category] || 'default'}>
                        {CATEGORY_LABEL[exp.category] || exp.category}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{exp.description}</td>
                    <td className="py-3 font-medium text-right">{formatCurrency(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Spesa" size="md">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Select name="category" label="Categoria *" options={FORM_CATEGORIES} />
          <Input name="description" label="Descrizione *" required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="amount" label="Importo (EUR) *" type="number" step="0.01" min="0" required />
            <Input name="date" label="Data *" type="date" required />
          </div>
          <Input name="receipt" label="URL Ricevuta" placeholder="https://..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <MorphButton type="submit" text="Aggiungi Spesa" isLoading={submitting} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
