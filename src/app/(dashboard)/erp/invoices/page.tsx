'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'default', SENT: 'default', PAID: 'success', PARTIALLY_PAID: 'warning', OVERDUE: 'destructive', CANCELLED: 'outline',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviata', PAID: 'Pagata', PARTIALLY_PAID: 'Parziale', OVERDUE: 'Scaduta', CANCELLED: 'Annullata',
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.items || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fatture</h1>
        <Button onClick={() => router.push('/erp/invoices/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Fattura
        </Button>
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

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nessuna fattura trovata"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Crea la tua prima fattura o converti un preventivo.'}
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
                  <Badge variant={STATUS_BADGE[inv.status] || 'default'}>
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-3 pr-4 font-medium">Numero</th>
                  <th className="pb-3 pr-4 font-medium">Titolo</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Stato</th>
                  <th className="pb-3 pr-4 font-medium text-right">Totale</th>
                  <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Scadenza</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Pagata il</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/erp/invoices/${inv.id}`)}
                    className="border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium">{inv.number}</td>
                    <td className="py-3 pr-4">{inv.title}</td>
                    <td className="py-3 pr-4 text-muted">{inv.client.companyName}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[inv.status] || 'default'}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium text-right">{formatCurrency(inv.total)}</td>
                    <td className="py-3 pr-4 text-muted hidden lg:table-cell">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="py-3 text-muted hidden lg:table-cell">
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
