'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MicroExpander } from '@/components/ui/MicroExpander'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface Quote {
  id: string
  number: string
  title: string
  status: string
  total: string
  validUntil: string | null
  createdAt: string
  client: { companyName: string }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'SENT', label: 'Inviato' },
  { value: 'APPROVED', label: 'Approvato' },
  { value: 'REJECTED', label: 'Rifiutato' },
  { value: 'EXPIRED', label: 'Scaduto' },
  { value: 'INVOICED', label: 'Fatturato' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'default', SENT: 'default', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'outline', INVOICED: 'warning',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviato', APPROVED: 'Approvato', REJECTED: 'Rifiutato', EXPIRED: 'Scaduto', INVOICED: 'Fatturato',
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/quotes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuotes(data.items || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0" style={{ background: 'var(--gold-gradient)' }}>
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Preventivi</h1>
            <p className="text-xs md:text-sm text-muted">Crea e gestisci preventivi clienti</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <MicroExpander
            text="Nuovo Preventivo"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/erp/quotes/new')}
          />
        </div>
        <Button onClick={() => router.push('/erp/quotes/new')} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuovo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca preventivi..."
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
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nessun preventivo trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo preventivo.'}
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                onClick={() => router.push(`/erp/quotes/${q.id}`)}
                className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{q.number}</span>
                  <Badge variant={STATUS_BADGE[q.status] || 'default'}>
                    {STATUS_LABELS[q.status] || q.status}
                  </Badge>
                </div>
                <p className="text-sm truncate mb-1">{q.title}</p>
                <p className="text-xs text-muted mb-2">{q.client.companyName}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {q.validUntil ? `Val. ${new Date(q.validUntil).toLocaleDateString('it-IT')}` : 'Nessuna scadenza'}
                  </span>
                  <span className="font-bold text-sm">{formatCurrency(q.total)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Numero</th>
                  <th className="py-3 pr-4 font-medium">Titolo</th>
                  <th className="py-3 pr-4 font-medium">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Stato</th>
                  <th className="py-3 pr-4 font-medium text-right">Totale</th>
                  <th className="py-3 pr-4 font-medium hidden lg:table-cell">Valido fino a</th>
                  <th className="py-3 font-medium hidden lg:table-cell">Creato</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/erp/quotes/${q.id}`)}
                    className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium">{q.number}</td>
                    <td className="py-3 pr-4">{q.title}</td>
                    <td className="py-3 pr-4 text-muted">{q.client.companyName}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[q.status] || 'default'}>
                        {STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-medium text-right">{formatCurrency(q.total)}</td>
                    <td className="py-3 pr-4 text-muted hidden lg:table-cell">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="py-3 text-muted hidden lg:table-cell">
                      {new Date(q.createdAt).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} preventivi totali</p>
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
