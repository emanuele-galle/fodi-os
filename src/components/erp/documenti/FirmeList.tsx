'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FileSignature, Plus, Search, ChevronLeft, ChevronRight, Send, AlertCircle, X, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { SignatureStatusBadge } from '@/components/erp/SignatureStatusBadge'
import { NewSignatureModal } from '@/components/erp/NewSignatureModal'
import { useTableSort, sortData } from '@/hooks/useTableSort'

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

export function FirmeList() {
  const router = useRouter()
  const [items, setItems] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState<SignatureRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const limit = 20

  const [fetchError, setFetchError] = useState<string | null>(null)

  const { sortKey, sortDir, handleSort, sortIcon } = useTableSort('createdAt')
  const sortedItems = useMemo(() => sortData(items, sortKey, sortDir), [items, sortKey, sortDir])

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

  async function handleCancel() {
    if (!cancelConfirm) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/signatures/${cancelConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCancelConfirm(null)
        fetchItems()
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResendOtp(id: string) {
    setActionLoading(true)
    try {
      await fetch(`/api/signatures/${id}/send-otp`, { method: 'POST' })
      fetchItems()
    } catch {
      // silently fail
    } finally {
      setActionLoading(false)
    }
  }

  const canCancel = (status: string) => !['SIGNED', 'CANCELLED'].includes(status)
  const canResend = (status: string) => ['PENDING', 'OTP_SENT'].includes(status)

  return (
    <div>
      {/* Search + Filters + Action */}
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
                  <div className="flex items-center gap-1">
                    {canResend(req.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResendOtp(req.id) }}
                        className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Re-invia OTP"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canCancel(req.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCancelConfirm(req) }}
                        className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Annulla richiesta"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('documentTitle')}>Documento{sortIcon('documentTitle')}</th>
                  <th className="py-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('documentType')}>Tipo{sortIcon('documentType')}</th>
                  <th className="py-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('signerName')}>Firmatario{sortIcon('signerName')}</th>
                  <th className="py-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('status')}>Stato{sortIcon('status')}</th>
                  <th className="py-3 pr-4 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('expiresAt')}>Scadenza{sortIcon('expiresAt')}</th>
                  <th className="py-3 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('createdAt')}>Creato{sortIcon('createdAt')}</th>
                  <th className="py-3 pr-3 font-medium text-right w-20">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => router.push(`/erp/signatures/${req.id}`)}
                    className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 cursor-pointer transition-colors group"
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
                    <td className="py-3 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canResend(req.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResendOtp(req.id) }}
                            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Re-invia OTP"
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>
                        )}
                        {canCancel(req.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setCancelConfirm(req) }}
                            className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Annulla richiesta"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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

      {/* Modal Conferma Annullamento */}
      <Modal open={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Annulla Richiesta Firma" size="sm">
        <p className="text-sm text-muted mb-2">Sei sicuro di voler annullare questa richiesta di firma?</p>
        {cancelConfirm && (
          <div className="rounded-lg border border-border bg-secondary/5 p-3 mb-4">
            <p className="font-medium text-sm">{cancelConfirm.documentTitle}</p>
            <p className="text-xs text-muted mt-1">
              {cancelConfirm.signerName} ({cancelConfirm.signerEmail})
            </p>
          </div>
        )}
        <p className="text-xs text-destructive mb-4">La richiesta verrà annullata e il firmatario non potrà più firmare.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCancelConfirm(null)}>Indietro</Button>
          <Button variant="destructive" onClick={handleCancel} loading={actionLoading}>Annulla Richiesta</Button>
        </div>
      </Modal>
    </div>
  )
}
