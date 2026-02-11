'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, FileText, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  total: string
  sortOrder: number
}

interface QuoteDetail {
  id: string
  number: string
  title: string
  status: string
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  discount: string
  validUntil: string | null
  notes: string | null
  createdAt: string
  client: { id: string; companyName: string; pec: string | null; vatNumber: string | null }
  lineItems: LineItem[]
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'default', SENT: 'default', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'outline', INVOICED: 'warning',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviato', APPROVED: 'Approvato', REJECTED: 'Rifiutato', EXPIRED: 'Scaduto', INVOICED: 'Fatturato',
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.quoteId as string

  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (res.ok) setQuote(await res.json())
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => { fetchQuote() }, [fetchQuote])

  async function handleConvertToInvoice() {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote?.id }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/erp/invoices/${data.id}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Preventivo non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/erp/quotes')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const discountNum = parseFloat(quote.discount) || 0

  return (
    <div>
      <button
        onClick={() => router.push('/erp/quotes')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna ai preventivi
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{quote.number}</h1>
            <Badge variant={STATUS_BADGE[quote.status] || 'default'}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
          </div>
          <p className="text-muted mt-1">{quote.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === 'DRAFT' && (
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Invia
            </Button>
          )}
          {(quote.status === 'APPROVED' || quote.status === 'SENT') && (
            <Button size="sm" onClick={handleConvertToInvoice}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Converti in Fattura
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent>
          <CardTitle className="mb-3">Dati Cliente</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted">Ragione Sociale:</span>
              <span className="ml-2 font-medium">{quote.client.companyName}</span>
            </div>
            {quote.client.vatNumber && (
              <div>
                <span className="text-muted">P.IVA:</span>
                <span className="ml-2">{quote.client.vatNumber}</span>
              </div>
            )}
            {quote.client.pec && (
              <div>
                <span className="text-muted">PEC:</span>
                <span className="ml-2">{quote.client.pec}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <CardTitle className="mb-3">Voci</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Descrizione</th>
                  <th className="py-3 pr-4 font-medium text-right">Quantita</th>
                  <th className="py-3 pr-4 font-medium text-right">Prezzo Unitario</th>
                  <th className="py-3 font-medium text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <tr key={item.id} className="border-b border-border/50 even:bg-secondary/20">
                      <td className="py-3 pr-4">{item.description}</td>
                      <td className="py-3 pr-4 text-right">{item.quantity}</td>
                      <td className="py-3 pr-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted">Subtotale</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Sconto</span>
                <span className="text-destructive">-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">IVA ({quote.taxRate}%)</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
              <span>Totale</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardContent>
            <CardTitle className="mb-2">Note</CardTitle>
            <p className="text-sm text-muted whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
