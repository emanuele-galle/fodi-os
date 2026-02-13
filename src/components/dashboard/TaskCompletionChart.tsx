'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

interface WeeklyData {
  week: string
  completed: number
  created: number
}

const LABELS: Record<string, string> = { completed: 'Completate', created: 'Create' }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted mb-2">Sett. {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted">{LABELS[p.dataKey] || p.dataKey}</span>
          </div>
          <span className="font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

interface TaskCompletionChartProps {
  data: WeeklyData[]
  loading?: boolean
}

export function TaskCompletionChart({ data, loading }: TaskCompletionChartProps) {
  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} stroke="transparent" />
        <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted)' }} stroke="transparent" allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
        <Legend formatter={(v) => LABELS[v] || v} />
        <Bar dataKey="created" fill="url(#gradCreated)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" fill="url(#gradCompleted)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
