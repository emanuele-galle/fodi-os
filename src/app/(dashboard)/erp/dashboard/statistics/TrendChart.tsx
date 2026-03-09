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
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0]

export default function TrendChart({ months }: { months: MonthStats[] }) {
  const chartData = months.map(m => ({
    name: MONTH_LABELS[m.month - 1],
    Entrate: m.incomeGross,
    Spese: m.expenseGross,
    Profitto: m.profit,
  }))

  return (
    <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        <XAxis dataKey="name" fontSize={12} />
        {/* eslint-disable react-perf/jsx-no-new-function-as-prop -- recharts callbacks */}
        <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        {/* eslint-enable react-perf/jsx-no-new-function-as-prop */}
        <Legend />
        <Bar dataKey="Entrate" fill="#10B981" radius={BAR_RADIUS} />
        <Bar dataKey="Spese" fill="#EF4444" radius={BAR_RADIUS} />
      </BarChart>
    </ResponsiveContainer>
  )
}
