'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard'

const RevenueBarChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.RevenueBarChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const ExpenseBarChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.ExpenseBarChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

const MONTH_LABELS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

interface Stats {
  revenueMTD: number
  paid: number
}

interface RevenueDataPoint {
  month: string
  revenue: number
}

interface ExpenseDataPoint {
  category: string
  amount: number
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({ revenueMTD: 0, paid: 0 })
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseDataPoint[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setFetchError(null)
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [expensesRes] = await Promise.all([
          fetch('/api/expenses?limit=200'),
        ])

        // Invoices module removed
        const paidInvoices: { total: string; paidDate: string | null }[] = []

        // Build revenue chart data from paid invoices (last 6 months)
        const revenueByMonth: Record<string, number> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          revenueByMonth[key] = 0
        }
        for (const inv of paidInvoices) {
          if (inv.paidDate) {
            const d = new Date(inv.paidDate)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (key in revenueByMonth) {
              revenueByMonth[key] += parseFloat(inv.total)
            }
          }
        }
        setRevenueData(
          Object.entries(revenueByMonth).map(([key, revenue]) => ({
            month: MONTH_LABELS[parseInt(key.split('-')[1]) - 1],
            revenue,
          }))
        )

        // Build expense chart data grouped by category
        if (expensesRes.ok) {
          const expData = await expensesRes.json()
          const expenses: { category: string; amount: string }[] = expData.items || []
          const byCategory: Record<string, number> = {}
          let expTotal = 0
          for (const exp of expenses) {
            const amt = parseFloat(exp.amount)
            byCategory[exp.category] = (byCategory[exp.category] || 0) + amt
            expTotal += amt
          }
          setExpenseData(
            Object.entries(byCategory)
              .map(([category, amount]) => ({ category, amount }))
              .sort((a, b) => b.amount - a.amount)
          )
          setTotalExpenses(expTotal)
        }

        const paidTotal = paidInvoices.reduce((s, i) => s + parseFloat(i.total), 0)

        const revenueMTD = paidInvoices
          .filter((i) => i.paidDate && i.paidDate >= monthStart)
          .reduce((s, i) => s + parseFloat(i.total), 0)

        setStats({ revenueMTD, paid: paidTotal })

      } catch {
        setFetchError('Errore di rete nel caricamento dei report')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Fatturato Mese', value: stats.revenueMTD, icon: TrendingUp, color: 'text-primary' },
    { label: 'Incassato', value: stats.paid, icon: CheckCircle2, color: 'text-primary' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Report Finanziari</h1>
          <p className="text-xs md:text-sm text-muted">Analisi finanziaria e statistiche</p>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 md:h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 animate-stagger">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 !p-3 md:!p-4">
                <div className={`p-2 md:p-3 rounded-full bg-secondary ${stat.color}`}>
                  <stat.icon className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted truncate">{stat.label}</p>
                  <p className="text-base md:text-xl font-bold">{formatCurrency(stat.value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <FinancialSummaryCard
          income={stats.paid}
          expenses={totalExpenses}
          incomeLabel="Incassato"
          expenseLabel="Spese"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RevenueBarChart data={revenueData} />
        <ExpenseBarChart data={expenseData} />
      </div>
    </div>
  )
}
