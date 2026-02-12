'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MorphButton } from '@/components/ui/MorphButton'
import { MicroExpander } from '@/components/ui/MicroExpander'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  website: string | null
  totalRevenue: string
  _count?: { contacts: number; projects: number }
  createdAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Attivo' },
  { value: 'INACTIVE', label: 'Inattivo' },
  { value: 'CHURNED', label: 'Perso' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LEAD: 'default',
  PROSPECT: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'outline',
  CHURNED: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  CHURNED: 'Perso',
}

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Seleziona settore' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'healthcare', label: 'Sanita' },
  { value: 'finance', label: 'Finanza' },
  { value: 'manufacturing', label: 'Manifattura' },
  { value: 'services', label: 'Servizi' },
  { value: 'other', label: 'Altro' },
]

const SOURCE_OPTIONS = [
  { value: '', label: 'Seleziona fonte' },
  { value: 'website', label: 'Sito Web' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social Media' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Altro' },
]

export default function CrmPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const limit = 20

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClients(data.items || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  async function handleCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchClients()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Clienti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione clienti e relazioni commerciali</p>
          </div>
        </div>
        <div className="hidden sm:block">
          <MicroExpander
            text="Nuovo Cliente"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          />
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca clienti..."
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun cliente trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri di ricerca.' : 'Crea il tuo primo cliente per iniziare.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="!p-4 accent-line-left cursor-pointer active:bg-secondary/30 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 touch-manipulation"
                onClick={() => router.push(`/crm/${client.id}`)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={client.companyName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.companyName}</p>
                    <p className="text-xs text-muted">{client.industry || 'N/D'}</p>
                  </div>
                  <StatusBadge
                    leftLabel={STATUS_LABELS[client.status] || client.status}
                    rightLabel={`${client._count?.projects ?? 0} prog.`}
                    variant={client.status === 'ACTIVE' ? 'success' : client.status === 'CHURNED' ? 'error' : client.status === 'PROSPECT' ? 'warning' : client.status === 'LEAD' ? 'info' : 'default'}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{client._count?.contacts ?? 0} contatti</span>
                  <span className="font-medium text-foreground">{formatCurrency(client.totalRevenue)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 px-4 font-medium">Cliente</th>
                  <th className="py-3 px-4 font-medium">Stato</th>
                  <th className="py-3 px-4 font-medium">Settore</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Contatti</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Progetti</th>
                  <th className="py-3 px-4 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/crm/${client.id}`)}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-all duration-200 even:bg-secondary/20"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.companyName} size="sm" />
                        <span className="font-medium">{client.companyName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_BADGE[client.status] || 'default'}>
                        {STATUS_LABELS[client.status] || client.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {client.industry || '—'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted">
                      {client._count?.contacts ?? 0}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted">
                      {client._count?.projects ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(client.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">
                {total} client{total !== 1 ? 'i' : 'e'} totali
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Cliente" size="lg">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input name="companyName" label="Ragione Sociale *" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="vatNumber" label="P.IVA" />
            <Input name="pec" label="PEC" type="email" />
            <Input name="sdi" label="Codice SDI" />
            <Input name="website" label="Sito Web" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="industry" label="Settore" options={INDUSTRY_OPTIONS} />
            <Select name="source" label="Fonte" options={SOURCE_OPTIONS} />
          </div>
          <Select
            name="status"
            label="Stato"
            options={STATUS_OPTIONS.filter((o) => o.value !== '')}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              name="notes"
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <MorphButton type="submit" text="Crea Cliente" isLoading={submitting} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
