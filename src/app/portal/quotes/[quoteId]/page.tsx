'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface QuoteLine {
  id: string
  description: string
  quantity: number
  unitPrice: string
  total: string
}

interface QuoteDetail {
  id: string
  number: string
  title: string
  status: string
  total: string
  taxRate: string
  discount: string
  notes: string | null
  validUntil: string | null
  lines: QuoteLine[]
  createdAt: string
}


const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  SENT: 'Inviato',
  APPROVED: 'Approvato',
  REJECTED: 'Rifiutato',
  EXPIRED: 'Scaduto',
  INVOICED: 'Fatturato',
}

export default function PortalQuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.quoteId as string
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchQuote = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/quotes/${quoteId}`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      }
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  async function handleAction(action: 'approve' | 'reject') {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) fetchQuote()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Preventivo non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/portal')}>
          Torna alla home
        </Button>
      </div>
    )
  }

  const canRespond = quote.status === 'SENT'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Torna indietro">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold">Preventivo {quote.number}</h1>
          <Badge status={quote.status}>
            {STATUS_LABELS[quote.status] || quote.status}
          </Badge>
        </div>
      </div>

      {/* Quote Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-6">
          <div>
            <p className="text-muted">Titolo</p>
            <p className="font-medium">{quote.title}</p>
          </div>
          <div>
            <p className="text-muted">Data</p>
            <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString('it-IT')}</p>
          </div>
          <div>
            <p className="text-muted">Valido fino a</p>
            <p className="font-medium">
              {quote.validUntil
                ? new Date(quote.validUntil).toLocaleDateString('it-IT')
                : '—'}
            </p>
          </div>
        </div>

        {/* Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-3 pr-4 font-medium">Descrizione</th>
                <th className="pb-3 pr-4 font-medium text-right">Quantita</th>
                <th className="pb-3 pr-4 font-medium text-right">Prezzo Unit.</th>
                <th className="pb-3 font-medium text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines?.map((line) => (
                <tr key={line.id} className="border-b border-border">
                  <td className="py-3 pr-4">{line.description}</td>
                  <td className="py-3 pr-4 text-right">{line.quantity}</td>
                  <td className="py-3 pr-4 text-right">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="text-right space-y-1 text-sm">
            {parseFloat(quote.discount) > 0 && (
              <p>
                <span className="text-muted mr-4">Sconto:</span>
                <span>-{formatCurrency(quote.discount)}</span>
              </p>
            )}
            {parseFloat(quote.taxRate) > 0 && (
              <p>
                <span className="text-muted mr-4">IVA ({quote.taxRate}%):</span>
              </p>
            )}
            <p className="text-lg font-bold">
              <span className="text-muted mr-4 text-sm font-normal">Totale:</span>
              {formatCurrency(quote.total)}
            </p>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted mb-1">Note</p>
            <p className="text-sm">{quote.notes}</p>
          </div>
        )}
      </Card>

      {/* Approve / Reject */}
      {canRespond && (
        <div className="flex gap-3 justify-end">
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={() => handleAction('reject')}
          >
            <X className="h-4 w-4 mr-2" />
            Rifiuta
          </Button>
          <Button disabled={submitting} onClick={() => handleAction('approve')}>
            <Check className="h-4 w-4 mr-2" />
            Approva
          </Button>
        </div>
      )}
    </div>
  )
}
