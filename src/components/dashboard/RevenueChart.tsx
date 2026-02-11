'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
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

export function RevenueChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/invoices?limit=200')
        if (!res.ok) return

        const json = await res.json()
        const invoices: Invoice[] = json.items || []

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

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted)" />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="var(--color-muted)"
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value?: number, name?: string) => [formatCurrency(value ?? 0), name === 'paid' ? 'Pagato' : name === 'sent' ? 'Inviato' : 'Scaduto']}
          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
        />
        <Legend formatter={(v) => v === 'paid' ? 'Pagato' : v === 'sent' ? 'Inviato' : 'Scaduto'} />
        <Bar dataKey="paid" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
        <Bar dataKey="sent" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
        <Bar dataKey="overdue" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
