'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, AlertCircle, Pencil, Trash2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { AccountBalanceCard } from '@/components/erp/AccountBalanceCard'
import { formatCurrency } from '@/lib/utils'

interface BankAccount {
  id: string
  name: string
  type: string
  icon: string | null
  balance: number
  isActive: boolean
  sortOrder: number
}

interface BankTransfer {
  id: string
  date: string
  operation: string
  fromAccount: { id: string; name: string; icon: string | null }
  toAccount: { id: string; name: string; icon: string | null }
  amount: string
  notes: string | null
}

interface AccountSummary {
  totalIncome: number
  totalExpenses: number
  transfersIn: number
  transfersOut: number
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'bank', label: 'Conto Corrente' },
  { value: 'credit_card', label: 'Carta di Credito' },
  { value: 'cash', label: 'Contanti' },
]

const SECTION_CONFIG: { type: string; label: string }[] = [
  { type: 'bank', label: 'Conti Correnti' },
  { type: 'credit_card', label: 'Carte di Credito' },
  { type: 'cash', label: 'Contanti' },
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transfers, setTransfers] = useState<BankTransfer[]>([])
  const [summaries, setSummaries] = useState<Record<string, AccountSummary>>({})
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTransfers, setLoadingTransfers] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Account modal
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState<BankAccount | null>(null)

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/bank-accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.items || [])
      } else {
        setFetchError('Errore nel caricamento dei conti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei conti')
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchTransfers = useCallback(async () => {
    setLoadingTransfers(true)
    try {
      const res = await fetch('/api/bank-transfers')
      if (res.ok) {
        const data = await res.json()
        setTransfers(data.items || [])
      } else {
        setFetchError('Errore nel caricamento dei giroconti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei giroconti')
    } finally {
      setLoadingTransfers(false)
    }
  }, [])

  // Fetch summaries for each account
  const fetchSummaries = useCallback(async (accountList: BankAccount[]) => {
    const newSummaries: Record<string, AccountSummary> = {}

    // Fetch all incomes, expenses, and transfers in parallel
    const [incomesRes, expensesRes, transfersRes] = await Promise.all([
      fetch('/api/incomes?limit=5000').then(r => r.ok ? r.json() : { items: [] }),
      fetch('/api/expenses?limit=5000').then(r => r.ok ? r.json() : { items: [] }),
      fetch('/api/bank-transfers').then(r => r.ok ? r.json() : { items: [] }),
    ])

    const incomes = incomesRes.items || []
    const expenses = expensesRes.items || []
    const allTransfers = transfersRes.items || []

    for (const account of accountList) {
      const totalIncome = incomes
        .filter((i: { bankAccountId: string | null; amount: string }) => i.bankAccountId === account.id)
        .reduce((s: number, i: { amount: string }) => s + parseFloat(i.amount), 0)

      const totalExpenses = expenses
        .filter((e: { bankAccountId: string | null; amount: string }) => e.bankAccountId === account.id)
        .reduce((s: number, e: { amount: string }) => s + parseFloat(e.amount), 0)

      const transfersIn = allTransfers
        .filter((t: { toAccount: { id: string }; amount: string }) => t.toAccount.id === account.id)
        .reduce((s: number, t: { amount: string }) => s + parseFloat(t.amount), 0)

      const transfersOut = allTransfers
        .filter((t: { fromAccount: { id: string }; amount: string }) => t.fromAccount.id === account.id)
        .reduce((s: number, t: { amount: string }) => s + parseFloat(t.amount), 0)

      newSummaries[account.id] = { totalIncome, totalExpenses, transfersIn, transfersOut }
    }

    setSummaries(newSummaries)
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchTransfers()
  }, [fetchAccounts, fetchTransfers])

  useEffect(() => {
    if (accounts.length > 0) {
      fetchSummaries(accounts)
    }
  }, [accounts, fetchSummaries])

  const totalBalance = accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0)

  function openCreateAccount() {
    setEditAccount(null)
    setFormError(null)
    setAccountModalOpen(true)
  }

  function openEditAccount(account: BankAccount) {
    setEditAccount(account)
    setFormError(null)
    setAccountModalOpen(true)
  }

  function openCreateTransfer() {
    setFormError(null)
    setTransferModalOpen(true)
  }

  async function handleAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.balance) body.balance = parseFloat(body.balance as string)

    try {
      const url = editAccount ? `/api/bank-accounts/${editAccount.id}` : '/api/bank-accounts'
      const method = editAccount ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setAccountModalOpen(false)
        setEditAccount(null)
        fetchAccounts()
      } else {
        setFormError(editAccount ? 'Errore nella modifica del conto' : 'Errore nella creazione del conto')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAccount() {
    if (!deleteAccountConfirm) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bank-accounts/${deleteAccountConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteAccountConfirm(null)
        fetchAccounts()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTransferSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.amount) body.amount = parseFloat(body.amount as string)

    if (body.fromAccountId === body.toAccountId) {
      setFormError('Il conto di origine e destinazione devono essere diversi')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/bank-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setTransferModalOpen(false)
        fetchTransfers()
        fetchAccounts()
      } else {
        setFormError('Errore nella creazione del giroconto')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRealBalanceUpdate(accountId: string, value: number) {
    try {
      await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: value }),
      })
      fetchAccounts()
    } catch {
      // silently fail
    }
  }

  const accountOptions = accounts
    .filter((a) => a.isActive)
    .map((a) => ({ value: a.id, label: `${a.icon || ''} ${a.name}`.trim() }))

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Conti & Giroconti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione conti bancari e trasferimenti</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openCreateTransfer}>
              <ArrowRightLeft className="h-4 w-4" />
              Nuovo Giroconto
            </Button>
            <Button size="sm" onClick={openCreateAccount}>
              <Plus className="h-4 w-4" />
              Nuovo Conto
            </Button>
          </div>
          <div className="sm:hidden flex items-center gap-2">
            <Button variant="outline" onClick={openCreateTransfer} aria-label="Nuovo trasferimento">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <Button onClick={openCreateAccount} aria-label="Nuovo conto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Saldo totale */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-secondary text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted">Saldo Totale</p>
            <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button
            onClick={() => { setFetchError(null); fetchAccounts(); fetchTransfers() }}
            className="text-sm font-medium text-destructive hover:underline flex-shrink-0"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Sezioni Conti per Tipo */}
      {loadingAccounts ? (
        <div className="mb-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="mb-8">
          <EmptyState
            icon={Building2}
            title="Nessun conto configurato"
            description="Aggiungi i tuoi conti bancari per iniziare a gestire i trasferimenti."
            action={
              <Button onClick={openCreateAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Conto
              </Button>
            }
          />
        </div>
      ) : (
        SECTION_CONFIG.map(({ type, label }) => {
          const sectionAccounts = accounts.filter(a => a.type === type)
          if (sectionAccounts.length === 0) return null
          return (
            <div key={type} className="mb-8">
              <h2 className="text-base font-semibold mb-4">{label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionAccounts.map((account) => (
                  <div key={account.id} className="relative group">
                    <AccountBalanceCard
                      name={account.name}
                      type={account.type}
                      icon={account.icon}
                      balance={account.balance}
                      isActive={account.isActive}
                      summary={summaries[account.id] || null}
                      realBalance={account.balance}
                      onRealBalanceChange={(val) => handleRealBalanceUpdate(account.id, val)}
                    />
                    <div className="absolute top-3 right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditAccount(account)}
                        className="p-2 md:p-1.5 rounded-lg bg-card/80 backdrop-blur border border-border/30 hover:bg-secondary/40 transition-colors"
                        title="Modifica"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted" />
                      </button>
                      <button
                        onClick={() => setDeleteAccountConfirm(account)}
                        className="p-2 md:p-1.5 rounded-lg bg-card/80 backdrop-blur border border-border/30 hover:bg-secondary/40 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Sezione Registro Giroconti */}
      <div>
        <h2 className="text-base font-semibold mb-4">Registro Giroconti</h2>
        {loadingTransfers ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="Nessun giroconto registrato"
            description="I trasferimenti tra conti appariranno qui."
            action={
              accounts.length >= 2 ? (
                <Button onClick={openCreateTransfer}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Nuovo Giroconto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {transfers.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted">
                      {new Date(t.date).toLocaleDateString('it-IT')}
                    </span>
                    <span className="font-bold text-sm">{formatCurrency(t.amount)}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{t.operation}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted">
                    <span>{t.fromAccount.icon || '🏦'} {t.fromAccount.name}</span>
                    <ArrowRightLeft className="h-3 w-3 flex-shrink-0" />
                    <span>{t.toAccount.icon || '🏦'} {t.toAccount.name}</span>
                  </div>
                  {t.notes && <p className="text-xs text-muted mt-1 truncate">{t.notes}</p>}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Operazione</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Da</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">A</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Importo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                      <td className="px-4 py-3.5">{new Date(t.date).toLocaleDateString('it-IT')}</td>
                      <td className="px-4 py-3.5 font-medium">{t.operation}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{t.fromAccount.icon || '🏦'}</span>
                          <span>{t.fromAccount.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{t.toAccount.icon || '🏦'}</span>
                          <span>{t.toAccount.name}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3.5 text-muted max-w-[200px] truncate">{t.notes || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Crea/Modifica Conto */}
      <Modal
        open={accountModalOpen}
        onClose={() => { setAccountModalOpen(false); setEditAccount(null) }}
        title={editAccount ? 'Modifica Conto' : 'Nuovo Conto'}
        size="md"
      >
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          <Input
            name="name"
            label="Nome Conto *"
            placeholder="es. Conto Aziendale"
            required
            defaultValue={editAccount?.name || ''}
          />
          <Select
            name="type"
            label="Tipo *"
            options={ACCOUNT_TYPE_OPTIONS}
            defaultValue={editAccount?.type || 'bank'}
          />
          <Input
            name="icon"
            label="Icona (emoji)"
            placeholder="es. 🏛️ 💳 💵"
            defaultValue={editAccount?.icon || ''}
          />
          <Input
            name="balance"
            label="Saldo Iniziale (EUR)"
            type="number"
            step="0.01"
            defaultValue={editAccount?.balance?.toString() || '0'}
          />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setAccountModalOpen(false); setEditAccount(null) }}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>
              {editAccount ? 'Salva Modifiche' : 'Crea Conto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conferma Eliminazione Conto */}
      <Modal
        open={!!deleteAccountConfirm}
        onClose={() => setDeleteAccountConfirm(null)}
        title="Elimina Conto"
        size="sm"
      >
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare questo conto?</p>
        {deleteAccountConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">
              {deleteAccountConfirm.icon || '🏦'} {deleteAccountConfirm.name}
            </p>
            <p className="text-xs text-muted mt-1">
              Saldo: {formatCurrency(deleteAccountConfirm.balance)}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteAccountConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDeleteAccount} loading={submitting}>Elimina</Button>
        </div>
      </Modal>

      {/* Modal Nuovo Giroconto */}
      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Nuovo Giroconto"
        size="md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="date"
              label="Data *"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
            />
            <Input
              name="operation"
              label="Operazione *"
              placeholder="es. Giroconto mensile"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              name="fromAccountId"
              label="Da (Conto Origine) *"
              options={[{ value: '', label: 'Seleziona conto...' }, ...accountOptions]}
              required
            />
            <Select
              name="toAccountId"
              label="A (Conto Destinazione) *"
              options={[{ value: '', label: 'Seleziona conto...' }, ...accountOptions]}
              required
            />
          </div>
          <Input
            name="amount"
            label="Importo (EUR) *"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
          />
          <Input
            name="notes"
            label="Note"
            placeholder="Note aggiuntive..."
          />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setTransferModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>
              Registra Giroconto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
