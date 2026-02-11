'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface MarginData {
  name: string
  ricavo: number
  costo: number
  margine: number
}

export function MarginChart() {
  const [data, setData] = useState<MarginData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, invoicesRes, timeRes, expensesRes] = await Promise.all([
          fetch('/api/projects?limit=50').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/invoices?status=PAID&limit=200').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/time?limit=500').then((r) => r.ok ? r.json() : { items: [] }),
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : { items: [] }),
        ])

        const projects: { id: string; name: string }[] = projectsRes.items || []
        const invoices: { projectId: string | null; total: string }[] = invoicesRes.items || []
        const timeEntries: { projectId: string | null; hours: number; billable: boolean }[] = timeRes.items || []
        const expenses: { projectId: string | null; amount: string }[] = expensesRes.items || []

        const HOURLY_COST = 50 // costo orario medio

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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted)" angle={-20} textAnchor="end" height={60} />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="var(--color-muted)"
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value?: number, name?: string) => [
            name === 'margine' ? `${value ?? 0}%` : formatCurrency(value ?? 0),
            name === 'ricavo' ? 'Ricavo' : name === 'costo' ? 'Costo' : 'Margine',
          ]}
          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
        />
        <Legend formatter={(v) => v === 'ricavo' ? 'Ricavo' : v === 'costo' ? 'Costo' : 'Margine'} />
        <Bar dataKey="ricavo" fill="#22C55E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="costo" fill="#EF4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
