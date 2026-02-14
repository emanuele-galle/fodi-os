'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

interface TrendDataPoint {
  label: string
  value: number
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} attività</p>
    </div>
  )
}

interface ActivityTrendChartProps {
  color?: string
  height?: number
}

export function ActivityTrendChart({ color = 'var(--color-primary)', height = 260 }: ActivityTrendChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/activity?limit=100')
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        const items: { createdAt: string }[] = json.items || []

        // Count activities by day of week (last 4 weeks)
        const counts = new Array(7).fill(0)
        const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000
        for (const item of items) {
          const d = new Date(item.createdAt)
          if (d.getTime() >= fourWeeksAgo) {
            const dayIndex = (d.getDay() + 6) % 7 // Monday=0
            counts[dayIndex]++
          }
        }

        setData(DAY_LABELS.map((label, i) => ({ label, value: counts[i] })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-[220px] w-full" />

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="50%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: color, strokeDasharray: '4 4', strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill="url(#trendGradient)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 6, fill: color, stroke: 'var(--color-card)', strokeWidth: 3 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
