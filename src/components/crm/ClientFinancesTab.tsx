'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { ClientQuote } from './types'

interface ClientFinancesTabProps {
  clientId: string
  quotes: ClientQuote[]
}

export function ClientFinancesTab({ clientId, quotes }: ClientFinancesTabProps) {
  const [expenses, setExpenses] = useState<{ id: string; category: string; description: string; amount: string; date: string }[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)

  useEffect(() => {
    fetch(`/api/expenses?clientId=${clientId}&limit=200`)
      .then(r => r.json())
      .then(d => setExpenses(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingExpenses(false))
  }, [clientId])

  const quotesByStatus: Record<string, { count: number; total: number }> = {}
  for (const q of quotes) {
    if (!quotesByStatus[q.status]) quotesByStatus[q.status] = { count: 0, total: 0 }
    quotesByStatus[q.status].count++
    quotesByStatus[q.status].total += parseFloat(q.total) || 0
  }

  const revenue = (quotesByStatus['APPROVED']?.total || 0) + (quotesByStatus['INVOICED']?.total || 0)
  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const margin = revenue - totalExpenses

  const STATUS_LABELS_FINANCE: Record<string, string> = {
    DRAFT: 'Bozza', SENT: 'Inviato', APPROVED: 'Approvato', REJECTED: 'Rifiutato', EXPIRED: 'Scaduto', INVOICED: 'Fatturato'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-xs text-muted">Revenue</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-xs text-muted">Spese</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-xs text-muted">Margine</p>
            <p className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(margin)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <CardTitle className="text-sm mb-3">Preventivi per stato</CardTitle>
          {Object.keys(quotesByStatus).length === 0 ? (
            <p className="text-sm text-muted">Nessun preventivo</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(quotesByStatus).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge status={status}>{STATUS_LABELS_FINANCE[status] || status}</Badge>
                    <span className="text-muted">&times;{data.count}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(data.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!loadingExpenses && expenses.length > 0 && (
        <Card>
          <CardContent>
            <CardTitle className="text-sm mb-3">Ultime spese</CardTitle>
            <div className="space-y-2">
              {expenses.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{e.description}</span>
                    <span className="text-xs text-muted ml-2">{e.category}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
