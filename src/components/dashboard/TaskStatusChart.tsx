'use client'

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatusData {
  status: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  TODO: '#8C8680',
  IN_PROGRESS: '#4F46E5',
  IN_REVIEW: '#D97706',
  DONE: '#059669',
  CANCELLED: '#DC2626',
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da Fare',
  IN_PROGRESS: 'In Corso',
  IN_REVIEW: 'In Revisione',
  DONE: 'Completate',
  CANCELLED: 'Cancellate',
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { status: string } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[item.payload.status] || '#8C8680' }} />
        <span className="text-muted">{STATUS_LABELS[item.payload.status] || item.payload.status}</span>
        <span className="font-semibold tabular-nums ml-2">{item.value}</span>
      </div>
    </div>
  )
}

interface TaskStatusChartProps {
  data: StatusData[]
  loading?: boolean
}

export function TaskStatusChart({ data, loading }: TaskStatusChartProps) {
  if (loading) return <Skeleton className="h-64 w-full" />

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="flex items-center gap-6">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="count"
              nameKey="status"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#8C8680'} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
              {total}
            </text>
            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted text-xs">
              Task totali
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 min-w-[120px]">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[entry.status] || '#8C8680' }} />
            <span className="text-muted truncate">{STATUS_LABELS[entry.status] || entry.status}</span>
            <span className="font-semibold tabular-nums ml-auto">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
