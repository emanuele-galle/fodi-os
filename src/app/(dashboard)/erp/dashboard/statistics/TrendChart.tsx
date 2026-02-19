'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MonthStats {
  month: number
  incomeGross: number
  expenseGross: number
  profit: number
}

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

export default function TrendChart({ months }: { months: MonthStats[] }) {
  const chartData = months.map(m => ({
    name: MONTH_LABELS[m.month - 1],
    Entrate: m.incomeGross,
    Spese: m.expenseGross,
    Profitto: m.profit,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Legend />
        <Bar dataKey="Entrate" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Spese" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
