'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface Communication {
  id: string
  campaignName: string
  contactEmail: string
  subject: string
  bodyHtml: string | null
  scenario: string | null
  status: string
  sentAt: string | null
  createdAt: string
  client: { id: string; companyName: string }
  contact: { id: string; firstName: string; lastName: string } | null
  sentBy: { id: string; firstName: string; lastName: string } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_BADGE: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
}

export function CommunicationHistory() {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/crm/communications?${params}`)
      const data = await res.json()
      if (data.success) {
        setCommunications(data.data)
        setPagination(data.pagination)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(1, '') }, [fetchData])

  const handleSearch = useCallback(() => {
    fetchData(1, search)
  }, [search, fetchData])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchData(1, search)
  }, [search, fetchData])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const handlePrev = useCallback(() => {
    if (pagination.page > 1) fetchData(pagination.page - 1, search)
  }, [pagination.page, search, fetchData])

  const handleNext = useCallback(() => {
    if (pagination.page < pagination.totalPages) fetchData(pagination.page + 1, search)
  }, [pagination.page, pagination.totalPages, search, fetchData])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cerca per cliente, email o oggetto..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Cerca</Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          Nessuna comunicazione trovata
        </div>
      ) : (
        <div className="space-y-2">
          {communications.map(comm => (
            <div key={comm.id} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => handleToggle(comm.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{comm.client.companyName}</span>
                    <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full font-medium', STATUS_BADGE[comm.status] || STATUS_BADGE.PENDING)}>
                      {comm.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted truncate">{comm.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span>{comm.contactEmail}</span>
                    <span>{formatDate(comm.createdAt)}</span>
                    {comm.sentBy && <span>da {comm.sentBy.firstName} {comm.sentBy.lastName}</span>}
                  </div>
                </div>
                {expandedId === comm.id ? <ChevronUp className="h-4 w-4 text-muted flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted flex-shrink-0" />}
              </button>
              {expandedId === comm.id && comm.bodyHtml && (
                <div className="px-4 py-3 border-t border-border bg-secondary/10">
                  <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: comm.bodyHtml }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {pagination.total} comunicazioni — Pagina {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} disabled={pagination.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} disabled={pagination.page >= pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
