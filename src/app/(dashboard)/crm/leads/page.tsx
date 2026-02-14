'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, ChevronLeft, ChevronRight, ArrowRightLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface Lead {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  service: string | null
  message: string
  source: string
  status: string
  notes: string | null
  assignee: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'NEW', label: 'Nuovo' },
  { value: 'CONTACTED', label: 'Contattato' },
  { value: 'QUALIFIED', label: 'Qualificato' },
  { value: 'CONVERTED', label: 'Convertito' },
  { value: 'LOST', label: 'Perso' },
]


const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuovo',
  CONTACTED: 'Contattato',
  QUALIFIED: 'Qualificato',
  CONVERTED: 'Convertito',
  LOST: 'Perso',
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [converting, setConverting] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const limit = 20

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei lead')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei lead')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  async function handleConvert(lead: Lead) {
    setConverting(lead.id)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: lead.company || lead.name,
          status: 'LEAD',
          source: lead.source,
          notes: `Convertito da lead: ${lead.name} (${lead.email})\n\nMessaggio originale: ${lead.message}`,
        }),
      })
      if (res.ok) {
        router.push('/crm')
      }
    } finally {
      setConverting(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Leads</h1>
          <p className="text-xs md:text-sm text-muted mt-1">Lead da form e webhook esterni</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per nome o email..."
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
          <button onClick={() => fetchLeads()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nessun lead trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri di ricerca.' : 'I lead arriveranno da form e webhook esterni.'}
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-lg border border-border bg-card p-4 space-y-2 touch-manipulation"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted truncate">{lead.email}</p>
                  </div>
                  <Badge status={lead.status}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {lead.company && <span className="truncate">{lead.company}</span>}
                  {lead.company && lead.service && <span>-</span>}
                  {lead.service && <span className="truncate">{lead.service}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {new Date(lead.createdAt).toLocaleDateString('it-IT')}
                  </span>
                  {lead.status !== 'CONVERTED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={converting === lead.id}
                      onClick={() => handleConvert(lead)}
                      className="touch-manipulation"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                      Converti
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Azienda</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden lg:table-cell">Servizio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/10 hover:bg-secondary/8 transition-colors cursor-pointer group even:bg-secondary/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-medium">{lead.name}</td>
                    <td className="px-4 py-3.5 text-muted">{lead.email}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {lead.company || '—'}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-muted">
                      {lead.service || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={lead.status}>
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(lead.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {lead.status !== 'CONVERTED' && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={converting === lead.id}
                            onClick={() => handleConvert(lead)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                            {converting === lead.id ? 'Conversione...' : 'Converti'}
                          </Button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">
                {total} lead totali
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
    </div>
  )
}
