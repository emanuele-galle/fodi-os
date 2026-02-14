'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/Skeleton'

interface FunnelData {
  name: string
  count: number
  color: string
}

const STATUS_CONFIG: { status: string; label: string; color: string }[] = [
  { status: 'LEAD', label: 'Lead', color: '#94A3B8' },
  { status: 'PROSPECT', label: 'Prospect', color: '#F59E0B' },
  { status: 'ACTIVE', label: 'Attivo', color: '#059669' },
  { status: 'INACTIVE', label: 'Inattivo', color: '#64748B' },
  { status: 'CHURNED', label: 'Perso', color: '#EF4444' },
]

export function PipelineFunnel() {
  const [data, setData] = useState<FunnelData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/clients?limit=200')
        if (!res.ok) return

        const json = await res.json()
        const clients: { status: string }[] = json.items || []

        const counts = new Map<string, number>()
        for (const c of clients) {
          counts.set(c.status, (counts.get(c.status) || 0) + 1)
        }

        setData(
          STATUS_CONFIG.map((cfg) => ({
            name: cfg.label,
            count: counts.get(cfg.status) || 0,
            color: cfg.color,
          }))
        )
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Skeleton className="h-48 w-full" />

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-foreground)', fontWeight: 500 }} stroke="transparent" tickLine={false} axisLine={false} width={75} />
        <Tooltip
          formatter={(value?: number) => [value ?? 0, 'Clienti']}
          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', fontSize: 13 }}
          cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.04 }}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
