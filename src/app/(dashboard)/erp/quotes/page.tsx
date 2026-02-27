'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Plus, Search, ChevronLeft, ChevronRight, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviato', APPROVED: 'Approvato', REJECTED: 'Rifiutato', EXPIRED: 'Scaduto', INVOICED: 'Fatturato',
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const limit = 20

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (clientFilter) params.set('clientId', clientFilter)
      const res = await fetch(`/api/quotes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuotes(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei preventivi')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei preventivi')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, clientFilter])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])
  useEffect(() => { setPage(1) }, [search, statusFilter, clientFilter])

  useEffect(() => {
    fetch('/api/clients?limit=200').then(r => r.json()).then(d => setClients(d.items || []))
  }, [])

  const totalPages = Math.ceil(total / limit)

  async function handleDelete() {
    if (!deleteConfirm) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/quotes/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchQuotes()
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Preventivi</h1>
            <p className="text-xs md:text-sm text-muted">Crea e gestisci preventivi clienti</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => router.push('/erp/quotes/new')}>
            <Plus className="h-4 w-4" />
            Nuovo Preventivo
          </Button>
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
        <Select
          options={[{ value: '', label: 'Tutti i clienti' }, ...clients.map(c => ({ value: c.id, label: c.companyName }))]}
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchQuotes()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nessun preventivo trovato"
          description={search || statusFilter || clientFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo preventivo.'}
          action={
            !search && !statusFilter && !clientFilter ? (
              <Button onClick={() => router.push('/erp/quotes/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Preventivo
              </Button>
            ) : undefined
          }
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
                  <Badge status={q.status}>
                    {STATUS_LABELS[q.status] || q.status}
                  </Badge>
                </div>
                <p className="text-sm truncate mb-1">{q.title}</p>
                <p className="text-xs text-muted mb-2">{q.client.companyName}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {q.validUntil ? `Val. ${new Date(q.validUntil).toLocaleDateString('it-IT')}` : 'Nessuna scadenza'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{formatCurrency(q.total)}</span>
                    {q.status === 'DRAFT' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(q) }}
                        className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Elimina bozza"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Titolo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Totale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Valido fino a</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Creato</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider w-16">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/erp/quotes/${q.id}`)}
                    className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-medium">{q.number}</td>
                    <td className="px-4 py-3.5">{q.title}</td>
                    <td className="px-4 py-3.5 text-muted">{q.client.companyName}</td>
                    <td className="px-4 py-3.5">
                      <Badge status={q.status}>
                        {STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-right tabular-nums">{formatCurrency(q.total)}</td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {new Date(q.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(q) }}
                          className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Elimina bozza"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs md:text-sm text-muted">{total} preventivi</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted tabular-nums">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      {/* Modal Conferma Eliminazione */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Elimina Preventivo" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler eliminare questo preventivo?</p>
        {deleteConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{deleteConfirm.number} — {deleteConfirm.title}</p>
            <p className="text-xs text-muted mt-1">
              {deleteConfirm.client.companyName} &middot; {formatCurrency(deleteConfirm.total)}
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">Questa azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDelete} loading={actionLoading}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
