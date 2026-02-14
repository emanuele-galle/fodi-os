'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileSignature, Plus, Search, ChevronLeft, ChevronRight, Send, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SignatureStatusBadge } from '@/components/erp/SignatureStatusBadge'
import { NewSignatureModal } from '@/components/erp/NewSignatureModal'

interface SignatureRequest {
  id: string
  documentType: string
  documentTitle: string
  signerName: string
  signerEmail: string
  status: string
  expiresAt: string
  signedAt: string | null
  createdAt: string
  requester: { firstName: string; lastName: string }
  signerClient: { companyName: string } | null
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'PENDING', label: 'In attesa' },
  { value: 'OTP_SENT', label: 'OTP inviato' },
  { value: 'SIGNED', label: 'Firmato' },
  { value: 'DECLINED', label: 'Rifiutato' },
  { value: 'EXPIRED', label: 'Scaduto' },
  { value: 'CANCELLED', label: 'Annullato' },
]

const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTE: 'Preventivo',
  CONTRACT: 'Contratto',
  CUSTOM: 'Altro',
}

export default function SignaturesPage() {
  const router = useRouter()
  const [items, setItems] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const limit = 20

  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/signatures?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento delle richieste di firma')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle richieste di firma')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <FileSignature className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Firme Digitali</h1>
            <p className="text-xs md:text-sm text-muted">Gestisci richieste di firma documenti</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Richiesta
          </Button>
        </div>
        <Button onClick={() => setShowModal(true)} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuova
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per titolo, firmatario..."
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
          <button onClick={() => fetchItems()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nessuna richiesta di firma"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Crea la tua prima richiesta di firma digitale.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Richiesta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {items.map((req) => (
              <div
                key={req.id}
                onClick={() => router.push(`/erp/signatures/${req.id}`)}
                className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted">{DOC_TYPE_LABELS[req.documentType] || req.documentType}</span>
                  <SignatureStatusBadge status={req.status} />
                </div>
                <p className="text-sm font-medium truncate mb-1">{req.documentTitle}</p>
                <p className="text-xs text-muted mb-2">
                  <Send className="h-3 w-3 inline mr-1" />
                  {req.signerName} ({req.signerEmail})
                </p>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Scade: {new Date(req.expiresAt).toLocaleDateString('it-IT')}</span>
                  <span>{new Date(req.createdAt).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Documento</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Firmatario</th>
                  <th className="py-3 pr-4 font-medium">Stato</th>
                  <th className="py-3 pr-4 font-medium hidden lg:table-cell">Scadenza</th>
                  <th className="py-3 font-medium hidden lg:table-cell">Creato</th>
                </tr>
              </thead>
              <tbody>
                {items.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => router.push(`/erp/signatures/${req.id}`)}
                    className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 pl-3">
                      <p className="font-medium truncate max-w-[250px]">{req.documentTitle}</p>
                      {req.signerClient && (
                        <p className="text-xs text-muted">{req.signerClient.companyName}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted">{DOC_TYPE_LABELS[req.documentType] || req.documentType}</td>
                    <td className="py-3 pr-4">
                      <p className="text-sm">{req.signerName}</p>
                      <p className="text-xs text-muted">{req.signerEmail}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <SignatureStatusBadge status={req.status} />
                    </td>
                    <td className="py-3 pr-4 text-muted hidden lg:table-cell">
                      {new Date(req.expiresAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="py-3 text-muted hidden lg:table-cell">
                      {new Date(req.createdAt).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} richieste totali</p>
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

      <NewSignatureModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => fetchItems()}
      />
    </div>
  )
}
