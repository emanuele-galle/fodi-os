'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardTitle, CardHeader, CardHeading } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { FatturapaStatusBadge } from '@/components/erp/FatturapaStatusBadge'
import { EINVOICE_STATUS_CONFIG, TIPO_DOCUMENTO_LABELS } from '@/lib/fatturapa'
import { formatCurrency } from '@/lib/utils'
import { FileText, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

interface DashboardItem {
  id: string
  status: string
  tipoDocumento: string
  xmlFileName: string | null
  sdiIdentificativo: string | null
  esitoType: string | null
  createdAt: string
  invoice: {
    id: string
    number: string
    title: string
    total: string
    status: string
    issuedDate: string | null
    client: { id: string; companyName: string }
  }
}

interface DashboardData {
  counts: Record<string, number>
  total: number
  items: DashboardItem[]
  filteredTotal: number
  page: number
  limit: number
  totalPages: number
}

export default function FatturapaDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [page, setPage] = useState(1)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (tipoFilter) params.set('tipo', tipoFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/erp/fatturapa/dashboard?${params}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        setFetchError('Errore nel caricamento delle fatture elettroniche')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle fatture elettroniche')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, tipoFilter, page])

  useEffect(() => { fetchData() }, [fetchData])

  const statusOptions = [
    { value: '', label: 'Tutti gli stati' },
    ...Object.entries(EINVOICE_STATUS_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
    })),
  ]

  const tipoOptions = [
    { value: '', label: 'Tutti i tipi' },
    ...Object.entries(TIPO_DOCUMENTO_LABELS).map(([key, label]) => ({
      value: key,
      label,
    })),
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Fatturazione Elettronica</h1>
          <p className="text-sm text-muted mt-1">Gestione fatture elettroniche e stato SDI</p>
        </div>
      </div>

      {/* Status counts */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {Object.entries(EINVOICE_STATUS_CONFIG).map(([key, cfg]) => {
            const count = data.counts[key] || 0
            return (
              <button
                key={key}
                onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1) }}
                className={`p-3 rounded-xl border text-center transition-all ${
                  statusFilter === key
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/40 bg-card hover:bg-secondary/30'
                }`}
              >
                <div className="text-lg font-bold" style={{ color: cfg.color }}>{count}</div>
                <div className="text-xs text-muted truncate">{cfg.label}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex-1">
              <Select
                options={tipoOptions}
                value={tipoFilter}
                onChange={(e) => { setTipoFilter(e.target.value); setPage(1) }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchData()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessuna fattura elettronica"
          description={statusFilter || tipoFilter ? 'Nessun risultato con i filtri selezionati' : 'Le fatture elettroniche appariranno qui dopo la generazione XML'}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.items.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => router.push(`/erp/invoices/${item.invoice.id}`)}
              >
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{item.invoice.number}</span>
                    <FatturapaStatusBadge status={item.status} />
                  </div>
                  <p className="text-sm text-muted truncate">{item.invoice.client.companyName}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted">
                    <span>{TIPO_DOCUMENTO_LABELS[item.tipoDocumento] || item.tipoDocumento}</span>
                    <span className="font-medium text-foreground">{formatCurrency(item.invoice.total)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted bg-secondary/30">
                      <th className="py-3 px-4 font-medium">Fattura</th>
                      <th className="py-3 px-4 font-medium">Cliente</th>
                      <th className="py-3 px-4 font-medium">Tipo</th>
                      <th className="py-3 px-4 font-medium">Stato SDI</th>
                      <th className="py-3 px-4 font-medium">File</th>
                      <th className="py-3 px-4 font-medium text-right">Importo</th>
                      <th className="py-3 px-4 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors"
                        onClick={() => router.push(`/erp/invoices/${item.invoice.id}`)}
                      >
                        <td className="py-3 px-4 font-medium">{item.invoice.number}</td>
                        <td className="py-3 px-4 text-muted">{item.invoice.client.companyName}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs bg-secondary/60 px-2 py-0.5 rounded">
                            {TIPO_DOCUMENTO_LABELS[item.tipoDocumento] || item.tipoDocumento}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <FatturapaStatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-4 text-xs text-muted">{item.xmlFileName || '-'}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.invoice.total)}</td>
                        <td className="py-3 px-4 text-muted text-xs">
                          {new Date(item.createdAt).toLocaleDateString('it-IT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted">
                {data.filteredTotal} risultati - Pagina {data.page} di {data.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
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
