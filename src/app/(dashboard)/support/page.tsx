'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LifeBuoy, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN: 'destructive',
  IN_PROGRESS: 'warning',
  WAITING_CLIENT: 'default',
  RESOLVED: 'success',
  CLOSED: 'outline',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Lavorazione',
  WAITING_CLIENT: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<{ value: string; label: string }[]>([])
  const limit = 20

  const fetchTickets = useCallback(async () => {
    setLoading(true)
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
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

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
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchTickets()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Supporto</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Ticket
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">#</th>
                  <th className="py-3 pr-4 font-medium">Oggetto</th>
                  <th className="py-3 pr-4 font-medium hidden md:table-cell">Cliente</th>
                  <th className="py-3 pr-4 font-medium">Stato</th>
                  <th className="py-3 pr-4 font-medium">Priorita</th>
                  <th className="py-3 pr-4 font-medium hidden lg:table-cell">Assegnato a</th>
                  <th className="py-3 font-medium hidden lg:table-cell">Data</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/support/${ticket.id}`)}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-all duration-200 even:bg-secondary/20"
                  >
                    <td className="py-3 pr-4 font-medium text-muted">{ticket.number}</td>
                    <td className="py-3 pr-4 font-medium">{ticket.subject}</td>
                    <td className="py-3 pr-4 text-muted hidden md:table-cell">
                      {ticket.client?.companyName || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[ticket.status] || 'default'}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={PRIORITY_BADGE[ticket.priority] || 'default'}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted hidden lg:table-cell">
                      {ticket.assignee
                        ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                        : '—'}
                    </td>
                    <td className="py-3 text-muted hidden lg:table-cell">
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
          <Select name="clientId" label="Cliente" options={clients} />
          <Input name="subject" label="Oggetto *" required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione *</label>
            <textarea
              name="description"
              rows={4}
              required
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Descrivi il problema..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="priority" label="Priorità" options={PRIORITY_CREATE_OPTIONS} />
            <Select name="category" label="Categoria" options={CATEGORY_CREATE_OPTIONS} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creazione...' : 'Crea Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
