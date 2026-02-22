'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Plus, Pencil, Trash2, Building2, CreditCard, Tags, Target, Save, Percent, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'

interface AccountingCategory { id: string; name: string; type: string; icon: string | null; isActive: boolean; sortOrder: number }
interface BankAccount { id: string; name: string; type: string; icon: string | null; balance: string; isActive: boolean }
interface BusinessEntity { id: string; name: string; isActive: boolean }
interface VatRateItem { id: string; rate: string; label: string; code: string; description: string | null; isActive: boolean; isDefault: boolean; sortOrder: number }

type EditTarget = { type: 'category'; item?: AccountingCategory } | { type: 'account'; item?: BankAccount } | { type: 'entity'; item?: BusinessEntity } | { type: 'vatRate'; item?: VatRateItem } | null

export default function ErpSettingsPage() {
  const [categories, setCategories] = useState<AccountingCategory[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [entities, setEntities] = useState<BusinessEntity[]>([])
  const [vatRates, setVatRates] = useState<VatRateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [seedingVat, setSeedingVat] = useState(false)

  // Profit Goals
  const [goalYear, setGoalYear] = useState(new Date().getFullYear())
  const [goalAmounts, setGoalAmounts] = useState<Record<number, string>>({})
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [catRes, accRes, entRes, vatRes] = await Promise.all([
      fetch('/api/accounting-categories').then(r => r.json()),
      fetch('/api/bank-accounts').then(r => r.json()),
      fetch('/api/business-entities').then(r => r.json()),
      fetch('/api/vat-rates?active=false').then(r => r.json()),
    ])
    setCategories(catRes.items || [])
    setAccounts(accRes.items || [])
    setEntities(entRes.items || [])
    setVatRates(vatRes.items || [])
    setLoading(false)
  }, [])

  async function seedVatRates() {
    setSeedingVat(true)
    try {
      await fetch('/api/vat-rates/seed', { method: 'POST' })
      fetchAll()
    } finally {
      setSeedingVat(false)
    }
  }

  const fetchGoals = useCallback(async (year: number) => {
    try {
      const res = await fetch(`/api/profit-goals?year=${year}`)
      const data = await res.json()
      const amounts: Record<number, string> = {}
      for (const g of (data.items || [])) {
        amounts[g.month] = String(g.amount)
      }
      setGoalAmounts(amounts)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchGoals(goalYear) }, [goalYear, fetchGoals])

  async function saveGoals() {
    setSavingGoals(true)
    setGoalSaved(false)
    try {
      const promises = Object.entries(goalAmounts)
        .filter(([, v]) => v && parseFloat(v) > 0)
        .map(([month, amount]) =>
          fetch('/api/profit-goals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: goalYear, month: parseInt(month), amount: parseFloat(amount) }),
          })
        )
      await Promise.all(promises)
      setGoalSaved(true)
      setTimeout(() => setGoalSaved(false), 3000)
    } finally {
      setSavingGoals(false)
    }
  }

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => { if (typeof v === 'string' && v.trim()) body[k] = v.trim() })

    try {
      if (editTarget.type === 'category') {
        const item = editTarget.item
        body.isActive = true
        body.sortOrder = item?.sortOrder ?? 0
        if (!body.icon) body.icon = null
        const url = item ? `/api/accounting-categories/${item.id}` : '/api/accounting-categories'
        await fetch(url, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else if (editTarget.type === 'account') {
        const item = editTarget.item
        if (body.balance) body.balance = parseFloat(body.balance as string)
        if (!body.icon) body.icon = null
        const url = item ? `/api/bank-accounts/${item.id}` : '/api/bank-accounts'
        await fetch(url, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else if (editTarget.type === 'entity') {
        const item = editTarget.item
        body.isActive = true
        const url = item ? `/api/business-entities/${item.id}` : '/api/business-entities'
        await fetch(url, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else if (editTarget.type === 'vatRate') {
        const item = editTarget.item
        if (body.rate) body.rate = parseFloat(body.rate as string)
        body.isActive = true
        const url = item ? `/api/vat-rates/${item.id}` : '/api/vat-rates'
        await fetch(url, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      setEditTarget(null)
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      const urlMap: Record<string, string> = { category: 'accounting-categories', account: 'bank-accounts', entity: 'business-entities', vatRate: 'vat-rates' }
      await fetch(`/api/${urlMap[deleteTarget.type]}/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchAll()
    } finally {
      setSubmitting(false)
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 md:p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Impostazioni Contabilità</h1>
          <p className="text-xs md:text-sm text-muted">Categorie, conti bancari e attività</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Categorie Entrate */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Tags className="h-4 w-4" /> Categorie Entrate</CardTitle>
                <CardDescription>Categorie per classificare le entrate</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditTarget({ type: 'category' })}><Plus className="h-4 w-4" /> Nuova</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted">Caricamento...</p> : incomeCategories.length === 0 ? (
              <p className="text-sm text-muted">Nessuna categoria entrate. Creane una per iniziare.</p>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.icon && <span>{c.icon}</span>}
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-xs">entrata</Badge>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget({ type: 'category', item: c })} className="p-1.5 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'category', id: c.id, name: c.name })} className="p-1.5 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categorie Spese */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Tags className="h-4 w-4" /> Categorie Spese</CardTitle>
                <CardDescription>Categorie per classificare le spese</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditTarget({ type: 'category' })}><Plus className="h-4 w-4" /> Nuova</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted">Caricamento...</p> : expenseCategories.length === 0 ? (
              <p className="text-sm text-muted">Nessuna categoria spese. Creane una per iniziare.</p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.icon && <span>{c.icon}</span>}
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-xs">spesa</Badge>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget({ type: 'category', item: c })} className="p-1.5 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'category', id: c.id, name: c.name })} className="p-1.5 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conti Bancari - Link */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Conti Bancari</CardTitle>
                <CardDescription>Conti correnti, carte e contanti</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/erp/accounts" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Gestisci conti bancari &rarr;
            </a>
          </CardContent>
        </Card>

        {/* Attività */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Attività</CardTitle>
                <CardDescription>Entità aziendali o rami d&apos;attività</CardDescription>
              </div>
              <Button size="sm" onClick={() => setEditTarget({ type: 'entity' })}><Plus className="h-4 w-4" /> Nuova</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted">Caricamento...</p> : entities.length === 0 ? (
              <p className="text-sm text-muted">Nessuna attività. Creane una per iniziare.</p>
            ) : (
              <div className="space-y-2">
                {entities.map(ent => (
                  <div key={ent.id} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                    <span className="font-medium text-sm">{ent.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget({ type: 'entity', item: ent })} className="p-1.5 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'entity', id: ent.id, name: ent.name })} className="p-1.5 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Obiettivi Profitto */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Obiettivi Profitto</CardTitle>
                <CardDescription>Imposta obiettivi di profitto mensili</CardDescription>
              </div>
              <Select
                label=""
                value={String(goalYear)}
                onChange={e => setGoalYear(parseInt(e.target.value))}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i
                  return { value: String(y), label: String(y) }
                })}
                className="w-28"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'] as const).map((label, i) => (
                <div key={i}>
                  <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={goalAmounts[i + 1] || ''}
                    onChange={e => setGoalAmounts(prev => ({ ...prev, [i + 1]: e.target.value }))}
                    className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 mt-4">
              {goalSaved && <span className="text-sm text-emerald-600 font-medium">Salvato!</span>}
              <Button onClick={saveGoals} loading={savingGoals} size="sm">
                <Save className="h-4 w-4" /> Salva Obiettivi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aliquote IVA */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4" /> Aliquote IVA</CardTitle>
                <CardDescription>Aliquote IVA configurabili per entrate e spese</CardDescription>
              </div>
              <div className="flex gap-2">
                {vatRates.length === 0 && (
                  <Button size="sm" variant="outline" onClick={seedVatRates} disabled={seedingVat}>
                    {seedingVat ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Carica Standard
                  </Button>
                )}
                <Button size="sm" onClick={() => setEditTarget({ type: 'vatRate' })}><Plus className="h-4 w-4" /> Nuova</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted">Caricamento...</p> : vatRates.length === 0 ? (
              <p className="text-sm text-muted">Nessuna aliquota IVA. Clicca &quot;Carica Standard&quot; per importare le aliquote italiane.</p>
            ) : (
              <div className="space-y-2">
                {vatRates.map(vr => (
                  <div key={vr.id} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{vr.label}</span>
                      <Badge variant="outline" className="text-xs">{vr.code}</Badge>
                      {vr.isDefault && <Badge variant="default" className="text-xs">Default</Badge>}
                      {!vr.isActive && <Badge variant="outline" className="text-xs text-muted">Disattivata</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget({ type: 'vatRate', item: vr })} className="p-1.5 rounded hover:bg-secondary/20"><Pencil className="h-3.5 w-3.5 text-muted" /></button>
                      <button onClick={() => setDeleteTarget({ type: 'vatRate', id: vr.id, name: vr.label })} className="p-1.5 rounded hover:bg-secondary/20"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Crea/Modifica */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={
        editTarget?.type === 'category' ? (editTarget.item ? 'Modifica Categoria' : 'Nuova Categoria') :
        editTarget?.type === 'account' ? (editTarget.item ? 'Modifica Conto' : 'Nuovo Conto') :
        editTarget?.type === 'entity' ? (editTarget.item ? 'Modifica Attività' : 'Nuova Attività') :
        editTarget?.type === 'vatRate' ? (editTarget.item ? 'Modifica Aliquota IVA' : 'Nuova Aliquota IVA') : ''
      } size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {editTarget?.type === 'category' && (
            <>
              <Input name="name" label="Nome *" required defaultValue={editTarget.item?.name || ''} />
              <Select name="type" label="Tipo *" options={[{ value: 'income', label: 'Entrata' }, { value: 'expense', label: 'Spesa' }]} defaultValue={editTarget.item?.type || 'income'} />
              <Input name="icon" label="Icona (emoji)" placeholder="💰" defaultValue={editTarget.item?.icon || ''} />
            </>
          )}
          {editTarget?.type === 'account' && (
            <>
              <Input name="name" label="Nome *" required defaultValue={editTarget.item?.name || ''} />
              <Select name="type" label="Tipo" options={[{ value: 'bank', label: 'Conto Corrente' }, { value: 'credit_card', label: 'Carta di Credito' }, { value: 'cash', label: 'Contanti' }]} defaultValue={editTarget.item?.type || 'bank'} />
              <Input name="icon" label="Icona (emoji)" placeholder="🏛️" defaultValue={editTarget.item?.icon || ''} />
              <Input name="balance" label="Saldo Iniziale (EUR)" type="number" step="0.01" defaultValue={editTarget.item?.balance || '0'} />
            </>
          )}
          {editTarget?.type === 'entity' && (
            <Input name="name" label="Nome *" required defaultValue={editTarget.item?.name || ''} />
          )}
          {editTarget?.type === 'vatRate' && (
            <>
              <Input name="label" label="Label *" required placeholder="22% Ordinaria" defaultValue={editTarget.item?.label || ''} />
              <div className="grid grid-cols-2 gap-4">
                <Input name="rate" label="Aliquota % *" type="number" step="0.01" min="0" max="100" required defaultValue={editTarget.item?.rate || ''} />
                <Input name="code" label="Codice *" required placeholder="22" defaultValue={editTarget.item?.code || ''} />
              </div>
              <Input name="description" label="Descrizione" defaultValue={editTarget.item?.description || ''} />
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Salva</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Conferma Eliminazione" size="sm">
        <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare <strong>{deleteTarget?.name}</strong>? Questa azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
