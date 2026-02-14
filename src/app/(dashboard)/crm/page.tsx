'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Plus, Search, ChevronLeft, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const limit = 20

  const clientForm = useFormPersist('new-client', {
    companyName: '',
    vatNumber: '',
    pec: '',
    sdi: '',
    website: '',
    industry: '',
    source: '',
    status: 'LEAD',
    notes: '',
  })

  // Open modal if ?action=new is in URL
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setModalOpen(true)
      router.replace('/crm', { scroll: false })
    }
  }, [searchParams, router])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/clients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClients(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei clienti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei clienti')
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

  function exportCSV() {
    if (clients.length === 0) return
    const rows = [['Ragione Sociale', 'Stato', 'Settore', 'Sito Web', 'Fatturato', 'Contatti', 'Progetti', 'Creato il']]
    for (const c of clients) {
      rows.push([
        c.companyName,
        STATUS_LABELS[c.status] || c.status,
        c.industry || '',
        c.website || '',
        c.totalRevenue || '0',
        String(c._count?.contacts || 0),
        String(c._count?.projects || 0),
        new Date(c.createdAt).toLocaleDateString('it-IT'),
      ])
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clienti-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, string> = {}
    for (const [k, v] of Object.entries(clientForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        clientForm.reset()
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
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Clienti</h1>
            <p className="text-xs md:text-sm text-muted">Gestione clienti e relazioni commerciali</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {clients.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Esporta CSV
            </Button>
          )}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuovo Cliente
          </Button>
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

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchClients()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

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
                className="!p-4 cursor-pointer active:bg-secondary/30 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 touch-manipulation"
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
                    status={client.status}
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
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Settore</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Contatti</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Progetti</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/crm/${client.id}`)}
                    className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.companyName} size="sm" />
                        <span className="font-medium">{client.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={client.status}>
                        {STATUS_LABELS[client.status] || client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {client.industry || '—'}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-muted tabular-nums">
                      {client._count?.contacts ?? 0}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-muted tabular-nums">
                      {client._count?.projects ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums">
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
          {clientForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={clientForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}
          <Input label="Ragione Sociale *" required value={clientForm.values.companyName} onChange={(e) => clientForm.setValue('companyName', e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="P.IVA" value={clientForm.values.vatNumber} onChange={(e) => clientForm.setValue('vatNumber', e.target.value)} />
            <Input label="PEC" type="email" value={clientForm.values.pec} onChange={(e) => clientForm.setValue('pec', e.target.value)} />
            <Input label="Codice SDI" value={clientForm.values.sdi} onChange={(e) => clientForm.setValue('sdi', e.target.value)} />
            <Input label="Sito Web" value={clientForm.values.website} onChange={(e) => clientForm.setValue('website', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Settore" options={INDUSTRY_OPTIONS} value={clientForm.values.industry} onChange={(e) => clientForm.setValue('industry', e.target.value)} />
            <Select label="Fonte" options={SOURCE_OPTIONS} value={clientForm.values.source} onChange={(e) => clientForm.setValue('source', e.target.value)} />
          </div>
          <Select
            label="Stato"
            value={clientForm.values.status}
            onChange={(e) => clientForm.setValue('status', e.target.value)}
            options={STATUS_OPTIONS.filter((o) => o.value !== '')}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              rows={3}
              value={clientForm.values.notes}
              onChange={(e) => clientForm.setValue('notes', e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>Crea Cliente</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
