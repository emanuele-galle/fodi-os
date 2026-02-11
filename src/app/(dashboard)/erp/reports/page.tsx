'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface Stats {
  revenueMTD: number
  invoiced: number
  paid: number
  outstanding: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({ revenueMTD: 0, invoiced: 0, paid: 0, outstanding: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [invoicesRes, paidRes] = await Promise.all([
          fetch('/api/invoices?limit=200'),
          fetch(`/api/invoices?status=PAID&limit=200`),
        ])

        let allInvoices: { total: string; status: string }[] = []
        let paidInvoices: { total: string; paidDate: string | null }[] = []

        if (invoicesRes.ok) {
          const data = await invoicesRes.json()
          allInvoices = data.items || []
        }
        if (paidRes.ok) {
          const data = await paidRes.json()
          paidInvoices = data.items || []
        }

        const invoicedTotal = allInvoices.reduce((s, i) => s + parseFloat(i.total), 0)
        const paidTotal = allInvoices
          .filter((i) => i.status === 'PAID')
          .reduce((s, i) => s + parseFloat(i.total), 0)
        const outstanding = allInvoices
          .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
          .reduce((s, i) => s + parseFloat(i.total), 0)

        const revenueMTD = paidInvoices
          .filter((i) => i.paidDate && i.paidDate >= monthStart)
          .reduce((s, i) => s + parseFloat(i.total), 0)

        setStats({ revenueMTD, invoiced: invoicedTotal, paid: paidTotal, outstanding })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Revenue MTD', value: stats.revenueMTD, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Fatturato Totale', value: stats.invoiced, icon: Receipt, color: 'text-blue-500' },
    { label: 'Incassato', value: stats.paid, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Da Incassare', value: stats.outstanding, icon: AlertCircle, color: 'text-amber-500' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Report Finanziari</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="text-xl font-bold">{formatCurrency(stat.value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Andamento Revenue</CardTitle>
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              Grafico in costruzione
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Distribuzione Spese</CardTitle>
            <div className="flex items-center justify-center h-48 text-muted text-sm">
              Grafico in costruzione
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
