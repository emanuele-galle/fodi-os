'use client'

import { useState, useEffect } from 'react'
import { Receipt } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface ClientExpensesTabProps {
  clientId: string
}

export function ClientExpensesTab({ clientId }: ClientExpensesTabProps) {
  const [expenses, setExpenses] = useState<Array<{ id: string; category: string; description: string; amount: string; date: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/expenses?clientId=${clientId}&limit=100`)
      .then(r => r.json())
      .then(d => setExpenses(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  const CATEGORY_LABEL: Record<string, string> = {
    hosting: 'Hosting', software: 'Software', hardware: 'Hardware', dominio: 'Domini',
    marketing: 'Marketing', formazione: 'Formazione', office: 'Ufficio', travel: 'Viaggi',
    meals: 'Pasti', other: 'Altro',
  }

  const total = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (expenses.length === 0) return <EmptyState icon={Receipt} title="Nessuna spesa collegata" description="Le spese associate a questo cliente appariranno qui." />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted">Totale: <strong className="text-foreground">{formatCurrency(total)}</strong></div>
      </div>
      <div className="space-y-2">
        {expenses.map(e => (
          <Card key={e.id} className="!p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{e.description}</span>
                <span className="text-xs text-muted">{CATEGORY_LABEL[e.category] || e.category} &middot; {new Date(e.date).toLocaleDateString('it-IT')}</span>
              </div>
              <span className="text-sm font-bold flex-shrink-0">{formatCurrency(e.amount)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
