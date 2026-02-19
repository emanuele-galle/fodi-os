'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

interface HoursData {
  projectName: string
  estimated: number
  actual: number
}

const LABELS: Record<string, string> = { estimated: 'Stimate', actual: 'Effettive' }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted">{LABELS[p.dataKey] || p.dataKey}</span>
          </div>
          <span className="font-semibold tabular-nums">{p.value}h</span>
        </div>
      ))}
    </div>
  )
}

interface HoursComparisonChartProps {
  data: HoursData[]
  loading?: boolean
}

export function HoursComparisonChart({ data, loading }: HoursComparisonChartProps) {
  if (loading) return <Skeleton className="h-64 w-full" />

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted">
        Nessun dato disponibile
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradEstimated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
        <XAxis dataKey="projectName" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
        <YAxis tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" tickFormatter={(v) => `${v}h`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
        <Legend formatter={(v) => LABELS[v] || v} />
        <Bar dataKey="estimated" fill="url(#gradEstimated)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" fill="url(#gradActual)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
