'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { LifeBuoy, Plus, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface Ticket {
  id: string
  number: string
  subject: string
  status: string
  priority: string
  category: string
  client: { companyName: string } | null
  assignee: { firstName: string; lastName: string } | null
  createdAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'OPEN', label: 'Aperto' },
  { value: 'IN_PROGRESS', label: 'In Lavorazione' },
  { value: 'WAITING_CLIENT', label: 'In Attesa Cliente' },
  { value: 'RESOLVED', label: 'Risolto' },
  { value: 'CLOSED', label: 'Chiuso' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tutte le priorità' },
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]


const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Lavorazione',
  WAITING_CLIENT: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}


const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const CATEGORY_CREATE_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'billing', label: 'Fatturazione' },
  { value: 'other', label: 'Altro' },
]

const PRIORITY_CREATE_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export default function SupportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<{ value: string; label: string }[]>([])
  const limit = 20

  const ticketForm = useFormPersist('new-ticket', {
    clientId: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    category: 'general',
  })

  // Open modal if ?action=new is in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setModalOpen(true)
      router.replace('/support', { scroll: false })
    }
  }, [searchParams, router])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      const res = await fetch(`/api/tickets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei ticket')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei ticket')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Real-time refresh when ticket data changes via SSE
  useRealtimeRefresh('ticket', fetchTickets)

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, priorityFilter])

  // Fetch clients for create modal
  useEffect(() => {
    fetch('/api/clients?limit=100')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        setClients([
          { value: '', label: 'Seleziona cliente' },
          ...(data.items || []).map((c: { id: string; companyName: string }) => ({
            value: c.id,
            label: c.companyName,
          })),
        ])
      })
  }, [])

  const totalPages = Math.ceil(total / limit)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, string> = {}
    for (const [k, v] of Object.entries(ticketForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        ticketForm.reset()
        setModalOpen(false)
        fetchTickets()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Supporto</h1>
            <p className="text-xs md:text-sm text-muted">Gestione ticket e assistenza</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Ticket
          </Button>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuovo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Select
          options={PRIORITY_OPTIONS}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTickets()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="Nessun ticket trovato"
          description={search || statusFilter || priorityFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo ticket.'}
          action={
            !search && !statusFilter && !priorityFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Ticket
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => router.push(`/support/${ticket.id}`)}
                className="p-4 space-y-2.5 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation shadow-[var(--shadow-sm)] rounded-lg border border-border/80 bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs text-muted font-medium">#{ticket.number}</span>
                    <p className="font-medium text-sm line-clamp-2 mt-0.5">{ticket.subject}</p>
                  </div>
                  <Badge status={ticket.status} className="flex-shrink-0 text-xs">
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <Badge status={ticket.priority} className="text-[10px]">
                      {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </Badge>
                    {ticket.client && (
                      <span className="truncate max-w-[120px]">{ticket.client.companyName}</span>
                    )}
                  </div>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Oggetto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Priorita</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Assegnato a</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Data</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/support/${ticket.id}`)}
                    className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-medium text-muted">{ticket.number}</td>
                    <td className="px-4 py-3.5 font-medium">{ticket.subject}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {ticket.client?.companyName || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={ticket.status}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={ticket.priority}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {ticket.assignee
                        ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted hidden lg:table-cell">
                      {new Date(ticket.createdAt).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} ticket totali</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Ticket" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {ticketForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={ticketForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}
          <Select label="Cliente" options={clients} value={ticketForm.values.clientId} onChange={(e) => ticketForm.setValue('clientId', e.target.value)} />
          <Input label="Oggetto *" required value={ticketForm.values.subject} onChange={(e) => ticketForm.setValue('subject', e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione *</label>
            <textarea
              rows={4}
              required
              value={ticketForm.values.description}
              onChange={(e) => ticketForm.setValue('description', e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Descrivi il problema..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Priorità" options={PRIORITY_CREATE_OPTIONS} value={ticketForm.values.priority} onChange={(e) => ticketForm.setValue('priority', e.target.value)} />
            <Select label="Categoria" options={CATEGORY_CREATE_OPTIONS} value={ticketForm.values.category} onChange={(e) => ticketForm.setValue('category', e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>Crea Ticket</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
