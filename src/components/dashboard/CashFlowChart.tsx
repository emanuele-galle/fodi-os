'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface MonthCashFlow {
  month: string
  entrate: number
  uscite: number
}

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; stroke: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.stroke }} />
            <span className="text-muted">{p.dataKey === 'entrate' ? 'Entrate' : 'Uscite'}</span>
          </div>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function CashFlowChart() {
  const [data, setData] = useState<MonthCashFlow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [expensesRes] = await Promise.all([
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : { items: [] }),
        ])

        // Invoices module removed
        const invoices: { paidDate: string | null; total: string }[] = []
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

  if (loading) return <Skeleton className="h-48 w-full" />

  const allZero = data.every(d => d.entrate === 0 && d.uscite === 0)

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted">
        <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -5, bottom: 5 }}>
        <defs>
          <linearGradient id="gradEntrate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
            <stop offset="50%" stopColor="var(--color-accent)" stopOpacity={0.08} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="gradUscite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.25} />
            <stop offset="50%" stopColor="var(--color-destructive)" stopOpacity={0.06} />
            <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
          stroke="transparent"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-primary)', strokeDasharray: '4 4', strokeOpacity: 0.3 }} />
        <Legend formatter={(v) => v === 'entrate' ? 'Entrate' : 'Uscite'} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12 }} />
        <Area
          type="monotone"
          dataKey="entrate"
          stroke="var(--color-accent)"
          fillOpacity={1}
          fill="url(#gradEntrate)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: 'var(--color-card)', strokeWidth: 3 }}
        />
        <Area
          type="monotone"
          dataKey="uscite"
          stroke="var(--color-destructive)"
          fillOpacity={1}
          fill="url(#gradUscite)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 6, fill: 'var(--color-destructive)', stroke: 'var(--color-card)', strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
