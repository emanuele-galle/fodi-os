'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DonutChartProps {
  data: { name: string; value: number; color?: string }[]
  total: number
  label?: string
  height?: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function DonutChart({ data, total, label, height = 200 }: DonutChartProps) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-bold">{formatCurrency(total)}</span>
        {label && <span className="text-sm text-muted">{label}</span>}
      </div>
    </div>
  )
}

export function DonutLegend({ data }: { data: { name: string; value: number; color?: string; percentage?: number }[] }) {
  return (
    <div className="space-y-1.5 mt-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }} />
            <span className="truncate">{item.name}</span>
          </div>
          <div className="flex items-center gap-3 text-right">
            <span className="font-medium tabular-nums">{formatCurrency(item.value)}</span>
            {item.percentage !== undefined && <span className="text-muted text-xs w-12">{item.percentage}%</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
