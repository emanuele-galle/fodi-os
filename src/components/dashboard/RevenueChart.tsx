'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  status: string
  total: string
  createdAt: string
  paidDate: string | null
}

interface MonthData {
  month: string
  paid: number
  sent: number
  overdue: number
}

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const LABELS: Record<string, string> = { paid: 'Pagato', sent: 'Inviato', overdue: 'Scaduto' }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted mb-2">{label}</p>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted">{LABELS[p.dataKey] || p.dataKey}</span>
          </div>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function RevenueChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Invoices module removed - revenue data not available
        const invoices: Invoice[] = []

        const now = new Date()
        const months: MonthData[] = []

        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const year = d.getFullYear()
          const month = d.getMonth()

          const monthInvoices = invoices.filter((inv) => {
            const created = new Date(inv.createdAt)
            return created.getFullYear() === year && created.getMonth() === month
          })

          months.push({
            month: `${MONTH_LABELS[month]} ${year !== now.getFullYear() ? year : ''}`.trim(),
            paid: monthInvoices
              .filter((i) => i.status === 'PAID')
              .reduce((s, i) => s + parseFloat(i.total), 0),
            sent: monthInvoices
              .filter((i) => i.status === 'SENT')
              .reduce((s, i) => s + parseFloat(i.total), 0),
            overdue: monthInvoices
              .filter((i) => i.status === 'OVERDUE')
              .reduce((s, i) => s + parseFloat(i.total), 0),
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

  const allZero = data.every(d => d.paid === 0 && d.sent === 0 && d.overdue === 0)

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted">
        <BarChart className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">Nessun dato disponibile</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -5, bottom: 5 }} barCategoryGap="20%">
        <defs>
          <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
        <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 13, fill: 'var(--color-muted)' }}
          stroke="transparent"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.04, radius: 4 }} />
        <Legend formatter={(v) => LABELS[v] || v} iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12 }} />
        <Bar dataKey="paid" stackId="a" fill="url(#gradPaid)" />
        <Bar dataKey="sent" stackId="a" fill="url(#gradSent)" />
        <Bar dataKey="overdue" stackId="a" fill="url(#gradOverdue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
