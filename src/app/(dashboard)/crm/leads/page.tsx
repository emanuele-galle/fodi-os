'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search, ChevronLeft, ChevronRight, AlertCircle, ArrowRightLeft, Mail, Phone, Building2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
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

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const limit = 20

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: 'LEAD',
      })
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
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
  }, [page, search])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Leads</h1>
            <p className="text-xs md:text-sm text-muted mt-0.5">Clienti in fase di acquisizione</p>
          </div>
        </div>
        <Button onClick={() => router.push('/crm')} variant="outline" size="sm">
          Tutti i clienti
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per nome azienda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Badge status="LEAD">Lead</Badge>
          <span>{total} totali</span>
        </div>
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
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nessun lead trovato"
          description={search ? 'Prova a modificare la ricerca.' : 'Nessun cliente con status Lead al momento.'}
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => router.push(`/crm/${lead.id}`)}
                className="rounded-xl border border-border/40 bg-card p-4 space-y-2.5 touch-manipulation active:scale-[0.98] cursor-pointer hover:shadow-[var(--shadow-sm)] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{lead.companyName}</p>
                    {lead.industry && (
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lead.industry}
                      </p>
                    )}
                  </div>
                  <Badge status="LEAD">Lead</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{new Date(lead.createdAt).toLocaleDateString('it-IT')}</span>
                  {lead._count && (
                    <span>{lead._count.contacts} contatti</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Azienda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Settore</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Sito Web</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Contatti</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted/80 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/crm/${lead.id}`)}
                    className="border-b border-border/10 hover:bg-secondary/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-medium">{lead.companyName}</td>
                    <td className="px-4 py-3 text-muted">{lead.industry || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.website ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted tabular-nums">
                      {lead._count?.contacts ?? 0}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(lead.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/crm/${lead.id}`)
                          }}
                        >
                          Dettagli
                        </Button>
                      </span>
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
