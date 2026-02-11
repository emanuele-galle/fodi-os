'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react'
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

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'warning',
  QUALIFIED: 'success',
  CONVERTED: 'success',
  LOST: 'destructive',
}

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
  const limit = 20

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.items || [])
        setTotal(data.total || 0)
      }
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted mt-1">Lead da form e webhook esterni</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 px-4 font-medium">Nome</th>
                  <th className="py-3 px-4 font-medium">Email</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Azienda</th>
                  <th className="py-3 px-4 font-medium hidden lg:table-cell">Servizio</th>
                  <th className="py-3 px-4 font-medium">Stato</th>
                  <th className="py-3 px-4 font-medium hidden md:table-cell">Data</th>
                  <th className="py-3 px-4 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors duration-200 even:bg-secondary/20"
                  >
                    <td className="py-3 px-4 font-medium">{lead.name}</td>
                    <td className="py-3 px-4 text-muted">{lead.email}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted">
                      {lead.company || '—'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted">
                      {lead.service || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_BADGE[lead.status] || 'default'}>
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted">
                      {new Date(lead.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {lead.status !== 'CONVERTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={converting === lead.id}
                          onClick={() => handleConvert(lead)}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                          {converting === lead.id ? 'Conversione...' : 'Converti'}
                        </Button>
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
