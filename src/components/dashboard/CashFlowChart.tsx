'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface MonthCashFlow {
  month: string
  entrate: number
  uscite: number
}

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export function CashFlowChart() {
  const [data, setData] = useState<MonthCashFlow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [invoicesRes, expensesRes] = await Promise.all([
          fetch('/api/invoices?status=PAID&limit=200').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : { items: [] }),
        ])

        const invoices = invoicesRes.items || []
        const expenses = expensesRes.items || []

        const now = new Date()
        const months: MonthCashFlow[] = []

        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const year = d.getFullYear()
          const month = d.getMonth()

          const entrate = invoices
            .filter((inv: { paidDate: string | null }) => {
              if (!inv.paidDate) return false
              const pd = new Date(inv.paidDate)
              return pd.getFullYear() === year && pd.getMonth() === month
            })
            .reduce((s: number, inv: { total: string }) => s + parseFloat(inv.total), 0)

          const uscite = expenses
            .filter((exp: { date: string }) => {
              const ed = new Date(exp.date)
              return ed.getFullYear() === year && ed.getMonth() === month
            })
            .reduce((s: number, exp: { amount: string }) => s + parseFloat(exp.amount), 0)

          months.push({
            month: `${MONTH_LABELS[month]} ${year !== now.getFullYear() ? year : ''}`.trim(),
            entrate,
            uscite,
          })
        }

        setData(months)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorEntrate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorUscite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="var(--color-muted)"
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
        />
        <Legend formatter={(v) => v === 'entrate' ? 'Entrate' : 'Uscite'} />
        <Area type="monotone" dataKey="entrate" stroke="#22C55E" fillOpacity={1} fill="url(#colorEntrate)" strokeWidth={2} />
        <Area type="monotone" dataKey="uscite" stroke="#EF4444" fillOpacity={1} fill="url(#colorUscite)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
