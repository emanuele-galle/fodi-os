'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface MarginData {
  name: string
  ricavo: number
  costo: number
  margine: number
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-muted mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted">{p.dataKey === 'ricavo' ? 'Ricavo' : 'Costo'}</span>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MarginChart() {
  const [data, setData] = useState<MarginData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, timeRes, expensesRes] = await Promise.all([
          fetch('/api/projects?limit=50').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/time?limit=500').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : { items: [] }),
        ])

        const projects: { id: string; name: string }[] = projectsRes.items || []
        // Invoices module removed
        const invoices: { projectId: string | null; total: string }[] = []
        const timeEntries: { projectId: string | null; hours: number; billable: boolean }[] = timeRes.items || []
        const expenses: { projectId: string | null; amount: string }[] = expensesRes.items || []

        const HOURLY_COST = 50

        const marginData: MarginData[] = projects.slice(0, 8).map((project) => {
          const ricavo = invoices
            .filter((i) => i.projectId === project.id)
            .reduce((s, i) => s + parseFloat(i.total), 0)

          const hours = timeEntries
            .filter((t) => t.projectId === project.id)
            .reduce((s, t) => s + t.hours, 0)

          const projectExpenses = expenses
            .filter((e) => e.projectId === project.id)
            .reduce((s, e) => s + parseFloat(e.amount), 0)

          const costo = hours * HOURLY_COST + projectExpenses
          const margine = ricavo > 0 ? ((ricavo - costo) / ricavo) * 100 : 0

          return {
            name: project.name.length > 15 ? project.name.slice(0, 15) + '...' : project.name,
            ricavo,
            costo,
            margine: Math.round(margine),
          }
        }).filter((d) => d.ricavo > 0 || d.costo > 0)

        setData(marginData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-64 w-full" />

  if (data.length === 0) {
    return <p className="text-sm text-muted text-center py-8">Nessun dato disponibile per il report margini.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradRicavo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradCosto" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
          stroke="transparent"
          angle={-30}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 13, fill: 'var(--color-muted)' }}
          stroke="transparent"
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
        <Legend
          formatter={(v) => v === 'ricavo' ? 'Ricavo' : 'Costo'}
          wrapperStyle={{ fontSize: 13 }}
        />
        <Bar dataKey="ricavo" fill="url(#gradRicavo)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="costo" fill="url(#gradCosto)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
