'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const MONTH_LABELS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

interface Stats {
  revenueMTD: number
  invoiced: number
  paid: number
  outstanding: number
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
  const [stats, setStats] = useState<Stats>({ revenueMTD: 0, invoiced: 0, paid: 0, outstanding: 0 })
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [invoicesRes, paidRes, expensesRes] = await Promise.all([
          fetch('/api/invoices?limit=200'),
          fetch(`/api/invoices?status=PAID&limit=200`),
          fetch('/api/expenses?limit=200'),
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
          for (const exp of expenses) {
            byCategory[exp.category] = (byCategory[exp.category] || 0) + parseFloat(exp.amount)
          }
          setExpenseData(
            Object.entries(byCategory)
              .map(([category, amount]) => ({ category, amount }))
              .sort((a, b) => b.amount - a.amount)
          )
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Distribuzione Spese</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `\u20AC${v}`} />
                <YAxis type="category" dataKey="category" width={100} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
