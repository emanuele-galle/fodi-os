'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Download, Search, Filter, AlertCircle, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { generateCSV, downloadCSV } from '@/lib/export-csv'

interface JournalEntry {
  id: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  invoiceNumber: string | null
  description: string
  debit: number
  credit: number
  balance: number
  account: string | null
  category: string | null
}

interface BankAccount {
  id: string
  name: string
}

const TYPE_OPTIONS = [
  { value: '', label: 'Tutti' },
  { value: 'income', label: 'Entrate' },
  { value: 'expense', label: 'Spese' },
  { value: 'transfer', label: 'Giroconti' },
]

const TYPE_CONFIG: Record<string, { label: string; color: 'success' | 'destructive' | 'outline'; icon: typeof TrendingUp }> = {
  income: { label: 'Entrata', color: 'success', icon: TrendingUp },
  expense: { label: 'Spesa', color: 'destructive', icon: TrendingDown },
  transfer: { label: 'Giroconto', color: 'outline', icon: ArrowRightLeft },
}

export function PrimaNota() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [typeFilter, setTypeFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [searchText, setSearchText] = useState('')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (typeFilter) params.set('type', typeFilter)
      if (accountFilter) params.set('accountId', accountFilter)
      if (searchText.trim()) params.set('search', searchText.trim())

      const res = await fetch(`/api/accounting/journal?${params}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      const data = await res.json()
      setEntries(data.items || [])
    } catch {
      setError('Errore nel caricamento della prima nota')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, typeFilter, accountFilter, searchText])

  useEffect(() => {
    fetch('/api/bank-accounts')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => setAccounts(data.items || []))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(fetchEntries, 300)
    return () => clearTimeout(timeout)
  }, [fetchEntries])

  const totals = entries.reduce(
    (acc, e) => ({
      debit: acc.debit + e.debit,
      credit: acc.credit + e.credit,
    }),
    { debit: 0, credit: 0 }
  )

  function handleExportCSV() {
    const headers = ['Data', 'Tipo', 'N. Fattura', 'Descrizione', 'Dare', 'Avere', 'Saldo', 'Conto', 'Categoria']
    const rows = entries.map((e) => [
      new Date(e.date).toLocaleDateString('it-IT'),
      TYPE_CONFIG[e.type]?.label || e.type,
      e.invoiceNumber || '',
      e.description,
      e.debit > 0 ? e.debit.toFixed(2) : '',
      e.credit > 0 ? e.credit.toFixed(2) : '',
      e.balance.toFixed(2),
      e.account || '',
      e.category || '',
    ])
    const csv = generateCSV(headers, rows)
    downloadCSV(`prima-nota_${dateFrom}_${dateTo}.csv`, csv)
  }

  const accountOptions = [
    { value: '', label: 'Tutti i conti' },
    ...accounts.map(a => ({ value: a.id, label: a.name })),
  ]

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtri</span>
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={entries.length === 0}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-border/20 bg-card p-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="Da" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="A" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Select label="Tipo" options={TYPE_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
            <Select label="Conto" options={accountOptions} value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cerca per descrizione, fornitore, n. fattura..."
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
          <p className="text-xs text-muted">Dare</p>
          <p className="text-sm md:text-base font-bold text-destructive">{formatCurrency(totals.debit)}</p>
        </div>
        <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
          <p className="text-xs text-muted">Avere</p>
          <p className="text-sm md:text-base font-bold text-success">{formatCurrency(totals.credit)}</p>
        </div>
        <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
          <p className="text-xs text-muted">Saldo</p>
          <p className="text-sm md:text-base font-bold">{formatCurrency(totals.credit - totals.debit)}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button onClick={fetchEntries} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">
            Riprova
          </button>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nessun movimento trovato"
          description="Modifica i filtri o registra nuove operazioni per vedere i movimenti."
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {entries.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type]
              return (
                <div key={entry.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.color} className="text-[10px]">{cfg.label}</Badge>
                      <span className="text-xs text-muted">{new Date(entry.date).toLocaleDateString('it-IT')}</span>
                    </div>
                    {entry.invoiceNumber && <span className="text-[10px] text-muted font-mono">{entry.invoiceNumber}</span>}
                  </div>
                  <p className="text-sm font-medium truncate">{entry.description}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex gap-3 text-xs">
                      {entry.debit > 0 && <span className="text-destructive">Dare: {formatCurrency(entry.debit)}</span>}
                      {entry.credit > 0 && <span className="text-success">Avere: {formatCurrency(entry.credit)}</span>}
                    </div>
                    <span className="text-xs font-mono text-muted">Saldo: {formatCurrency(entry.balance)}</span>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">N. Fattura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Descrizione</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Dare</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Avere</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Saldo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Conto</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const cfg = TYPE_CONFIG[entry.type]
                  return (
                    <tr key={entry.id} className="border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03]">
                      <td className="px-4 py-3.5 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('it-IT')}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={cfg.color} className="text-[10px]">{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted">{entry.invoiceNumber || '\u2014'}</td>
                      <td className="px-4 py-3.5 max-w-[300px] truncate">{entry.description}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-destructive">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-success">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium">{formatCurrency(entry.balance)}</td>
                      <td className="px-4 py-3.5 text-muted truncate max-w-[150px]">{entry.account || '\u2014'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/30 bg-secondary/5 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-sm">Totali</td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatCurrency(totals.debit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">{formatCurrency(totals.credit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.credit - totals.debit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  )
}
