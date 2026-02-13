'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { InvoiceStatusChart } from '@/components/dashboard/InvoiceStatusChart'
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard'

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
  const [invoiceDonut, setInvoiceDonut] = useState<{ label: string; value: number; color: string }[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
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

        // Invoice status donut chart
        const statusGroups: Record<string, number> = {}
        allInvoices.forEach((inv) => {
          statusGroups[inv.status] = (statusGroups[inv.status] || 0) + parseFloat(inv.total)
        })
        const STATUS_COLORS: Record<string, string> = {
          PAID: 'hsl(160, 84%, 39%)', SENT: 'hsl(239, 84%, 67%)',
          OVERDUE: 'hsl(0, 84%, 60%)', DRAFT: 'hsl(220, 9%, 46%)',
          PARTIALLY_PAID: 'hsl(38, 92%, 50%)',
        }
        const STATUS_LABELS: Record<string, string> = {
          PAID: 'Pagate', SENT: 'Inviate', OVERDUE: 'Scadute', DRAFT: 'Bozze', PARTIALLY_PAID: 'Parz. Pagate',
        }
        setInvoiceDonut(
          Object.entries(statusGroups).map(([status, value]) => ({
            label: STATUS_LABELS[status] || status, value,
            color: STATUS_COLORS[status] || 'hsl(220, 9%, 46%)',
          }))
        )

      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Revenue MTD', value: stats.revenueMTD, icon: TrendingUp, color: 'text-primary' },
    { label: 'Fatturato Totale', value: stats.invoiced, icon: Receipt, color: 'text-primary' },
    { label: 'Incassato', value: stats.paid, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Da Incassare', value: stats.outstanding, icon: AlertCircle, color: 'text-accent' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Report Finanziari</h1>
          <p className="text-xs md:text-sm text-muted">Analisi finanziaria e statistiche</p>
        </div>
      </div>

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

      {/* Donut Chart + Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <InvoiceStatusChart data={invoiceDonut} total={stats.invoiced} />
        <FinancialSummaryCard
          income={stats.paid}
          expenses={totalExpenses}
          incomeLabel="Incassato"
          expenseLabel="Spese"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardContent>
            <CardTitle className="mb-4 text-base md:text-lg">Andamento Revenue</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} margin={{ left: -10, right: 5 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" width={35} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                  cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }}
                />
                <Bar dataKey="revenue" fill="url(#gradRevenue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <CardTitle className="mb-4 text-base md:text-lg">Distribuzione Spese</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expenseData} layout="vertical" margin={{ left: 0, right: 5 }}>
                <defs>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis type="number" tickFormatter={(v) => `\u20AC${v}`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" />
                <YAxis type="category" dataKey="category" width={70} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} stroke="transparent" />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', backdropFilter: 'blur(8px)', fontSize: 12 }}
                  cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }}
                />
                <Bar dataKey="amount" fill="url(#gradExpense)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
