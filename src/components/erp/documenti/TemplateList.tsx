'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Search, ChevronLeft, ChevronRight, Copy, Trash2, MoreVertical, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface QuoteTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  isGlobal: boolean
  isActive: boolean
  primaryColor: string
  defaultTaxRate: string
  defaultValidDays: number
  createdAt: string
  client: { id: string; companyName: string } | null
  _count: { lineItems: number; quotes: number }
}

export function TemplateList() {
  const router = useRouter()
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 20

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), active: 'false' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/quote-templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.items || [])
        setTotal(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento dei template')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei template')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => { setPage(1) }, [search])

  async function handleDuplicate(templateId: string) {
    setActionMenuId(null)
    const res = await fetch(`/api/quote-templates/${templateId}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const json = await res.json()
      router.push(`/erp/templates/${json.data?.id || json.id}`)
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/quote-templates/${confirmDeleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDeleteId(null)
        fetchTemplates()
      }
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Action Button + Search */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => router.push('/erp/templates/new')}>
            <Plus className="h-4 w-4" />
            Nuovo Template
          </Button>
        </div>
        <Button onClick={() => router.push('/erp/templates/new')} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuovo
        </Button>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTemplates()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun template trovato"
          description={search ? 'Prova a modificare la ricerca.' : 'Crea il tuo primo template per velocizzare la creazione dei preventivi.'}
          action={
            !search ? (
              <Button onClick={() => router.push('/erp/templates/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Template
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => router.push(`/erp/templates/${t.id}`)}
                className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <span className="text-sm font-bold truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.isActive && <Badge variant="outline">Disattivato</Badge>}
                    <Badge variant={t.isGlobal ? 'default' : 'info'}>
                      {t.isGlobal ? 'Globale' : 'Cliente'}
                    </Badge>
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted mb-2 line-clamp-1">{t.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{t._count.lineItems} voci | {t._count.quotes} preventivi</span>
                  <span>IVA {parseFloat(t.defaultTaxRate)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Nome</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Voci</th>
                  <th className="py-3 pr-4 font-medium">Preventivi</th>
                  <th className="py-3 pr-4 font-medium">IVA</th>
                  <th className="py-3 pr-4 font-medium">Stato</th>
                  <th className="py-3 font-medium text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 transition-colors"
                  >
                    <td
                      className="py-3 pr-4 cursor-pointer"
                      onClick={() => router.push(`/erp/templates/${t.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          {t.description && (
                            <p className="text-xs text-muted truncate max-w-xs">{t.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={t.isGlobal ? 'default' : 'info'}>
                        {t.isGlobal ? 'Globale' : t.client?.companyName || 'Cliente'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted">{t._count.lineItems}</td>
                    <td className="py-3 pr-4 text-muted">{t._count.quotes}</td>
                    <td className="py-3 pr-4 text-muted">{parseFloat(t.defaultTaxRate)}%</td>
                    <td className="py-3 pr-4">
                      <Badge variant={t.isActive ? 'success' : 'outline'}>
                        {t.isActive ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="relative inline-block">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionMenuId(actionMenuId === t.id ? null : t.id)
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {actionMenuId === t.id && (
                          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(t.id) }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Duplica
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionMenuId(null); setConfirmDeleteId(t.id) }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Elimina
                            </button>
                          </div>
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
              <p className="text-sm text-muted">{total} template totali</p>
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

      {/* Close action menu on click outside */}
      {actionMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Elimina Template"
      >
        <p className="text-sm text-muted mb-4">
          Sei sicuro di voler eliminare questo template? Questa azione non puo essere annullata.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
            Annulla
          </Button>
          <Button variant="destructive" size="sm" loading={deleting} onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Elimina
          </Button>
        </div>
      </Modal>
    </div>
  )
}
