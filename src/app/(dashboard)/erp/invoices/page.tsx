'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Search, ChevronLeft, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  number: string
  title: string
  status: string
  total: string
  dueDate: string | null
  paidDate: string | null
  createdAt: string
  client: { companyName: string }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SENT', label: 'Inviata' },
  { value: 'PAID', label: 'Pagata' },
  { value: 'PARTIALLY_PAID', label: 'Parziale' },
  { value: 'OVERDUE', label: 'Scaduta' },
  { value: 'CANCELLED', label: 'Annullata' },
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviata', PAID: 'Pagata', PARTIALLY_PAID: 'Parziale', OVERDUE: 'Scaduta', CANCELLED: 'Annullata',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento delle fatture')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle fatture')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  function exportCSV() {
    if (invoices.length === 0) return
    const rows = [['Numero', 'Titolo', 'Cliente', 'Stato', 'Totale', 'Scadenza', 'Data Pagamento', 'Data Creazione']]
    for (const inv of invoices) {
      rows.push([
        inv.number,
        inv.title,
        inv.client.companyName,
        STATUS_LABELS[inv.status] || inv.status,
        inv.total || '0',
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('it-IT') : '',
        inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('it-IT') : '',
        new Date(inv.createdAt).toLocaleDateString('it-IT'),
      ])
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fatture-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Fatture</h1>
            <p className="text-xs md:text-sm text-muted">Emissione e tracking pagamenti</p>
          </div>
        </div>
        {invoices.length > 0 && (
          <Button size="sm" variant="outline" onClick={exportCSV} className="flex-shrink-0">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Esporta CSV</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca fatture..."
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
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchInvoices()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nessuna fattura trovata"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Le fatture vengono create convertendo un preventivo approvato.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push('/erp/quotes')}>
                Vai ai Preventivi
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => router.push(`/erp/invoices/${inv.id}`)}
                className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{inv.number}</span>
                  <Badge status={inv.status}>
                    {STATUS_LABELS[inv.status] || inv.status}
                  </Badge>
                </div>
                <p className="text-sm truncate mb-1">{inv.title}</p>
                <p className="text-xs text-muted mb-2">{inv.client.companyName}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {inv.dueDate ? `Scad. ${new Date(inv.dueDate).toLocaleDateString('it-IT')}` : 'Nessuna scadenza'}
                  </span>
                  <span className="font-bold text-sm">{formatCurrency(inv.total)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Titolo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Totale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Pagata il</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/erp/invoices/${inv.id}`)}
                    className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-medium">{inv.number}</td>
                    <td className="px-4 py-3.5">{inv.title}</td>
                    <td className="px-4 py-3.5 text-muted">{inv.client.companyName}</td>
                    <td className="px-4 py-3.5">
                      <Badge status={inv.status}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('it-IT') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} fatture totali</p>
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
    </div>
  )
}
