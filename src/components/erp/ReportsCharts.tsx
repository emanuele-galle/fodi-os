'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

interface RevenueDataPoint {
  month: string
  revenue: number
}

interface ExpenseDataPoint {
  category: string
  amount: number
}

export function RevenueBarChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Andamento Revenue</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -10, right: 5 }}>
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
  )
}

export function ExpenseBarChart({ data }: { data: ExpenseDataPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Distribuzione Spese</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 5 }}>
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
  )
}
