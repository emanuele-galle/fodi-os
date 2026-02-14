'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, Plus, Search, ChevronLeft, ChevronRight, Copy, Globe, GlobeLock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface WizardTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  isSystem: boolean
  status: string
  createdAt: string
  _count: { steps: number; submissions: number }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'DRAFT', label: 'Bozza' },
  { value: 'PUBLISHED', label: 'Pubblicato' },
  { value: 'ARCHIVED', label: 'Archiviato' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicato',
  ARCHIVED: 'Archiviato',
}

export default function WizardsPage() {
  const router = useRouter()
  const [wizards, setWizards] = useState<WizardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchWizards = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/wizards?${params}`)
      if (res.ok) {
        const data = await res.json()
        setWizards(data.items || [])
        setTotal(data.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchWizards() }, [fetchWizards])
  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Wizard</h1>
            <p className="text-xs md:text-sm text-muted">Questionari e moduli interattivi per la raccolta dati</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => router.push('/erp/wizards/new')}>
            <Plus className="h-4 w-4" />
            Nuovo Wizard
          </Button>
        </div>
        <Button onClick={() => router.push('/erp/wizards/new')} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Nuovo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca wizard..."
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
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : wizards.length === 0 ? (
        <EmptyState
          icon={Wand2}
          title="Nessun wizard trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri.' : 'Crea il tuo primo wizard.'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => router.push('/erp/wizards/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Wizard
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {wizards.map((w) => (
              <div
                key={w.id}
                onClick={() => router.push(`/erp/wizards/${w.id}`)}
                className="rounded-lg border border-border bg-card p-4 cursor-pointer active:bg-secondary/30 transition-colors touch-manipulation"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm truncate">{w.name}</span>
                  <Badge variant={STATUS_BADGE[w.status] || 'default'}>
                    {STATUS_LABELS[w.status] || w.status}
                  </Badge>
                </div>
                {w.description && <p className="text-xs text-muted truncate mb-2">{w.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{w._count.steps} step</span>
                  <span>{w._count.submissions} compilazioni</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Nome</th>
                  <th className="py-3 pr-4 font-medium">Stato</th>
                  <th className="py-3 pr-4 font-medium text-center">Step</th>
                  <th className="py-3 pr-4 font-medium text-center">Compilazioni</th>
                  <th className="py-3 pr-4 font-medium hidden lg:table-cell">Categoria</th>
                  <th className="py-3 font-medium hidden lg:table-cell">Creato</th>
                </tr>
              </thead>
              <tbody>
                {wizards.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => router.push(`/erp/wizards/${w.id}`)}
                    className="border-b border-border/50 even:bg-secondary/20 hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 pl-3">
                      <span className="font-medium">{w.name}</span>
                      {w.isSystem && <Badge variant="outline" className="ml-2 text-[10px]">Sistema</Badge>}
                      {w.description && <p className="text-xs text-muted truncate max-w-xs">{w.description}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={STATUS_BADGE[w.status] || 'default'}>
                        {STATUS_LABELS[w.status] || w.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-center">{w._count.steps}</td>
                    <td className="py-3 pr-4 text-center">{w._count.submissions}</td>
                    <td className="py-3 pr-4 text-muted capitalize hidden lg:table-cell">{w.category}</td>
                    <td className="py-3 text-muted hidden lg:table-cell">
                      {new Date(w.createdAt).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} wizard totali</p>
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
    </div>
  )
}
