'use client'

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

const TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  backdropFilter: 'blur(8px)',
  fontSize: 13,
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#ef4444']

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: 'Qualifica',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negoziaz.',
  CLOSED_WON: 'Vinta',
  CLOSED_LOST: 'Persa',
}

const INTERACTION_TYPE_LABELS: Record<string, string> = {
  CALL: 'Chiamate',
  EMAIL: 'Email',
  MEETING: 'Riunioni',
  NOTE: 'Note',
  WHATSAPP: 'WhatsApp',
  SOCIAL: 'Social',
}

const INTERACTION_COLORS: Record<string, string> = {
  CALL: '#6366f1',
  EMAIL: '#8b5cf6',
  MEETING: '#f59e0b',
  NOTE: '#a78bfa',
  WHATSAPP: '#22c55e',
  SOCIAL: '#ec4899',
}

interface DealsByStageData {
  stage: string
  count: number
  value: number
}

interface WonDealsData {
  month: string
  count: number
  value: number
}

interface InteractionsByTypeData {
  type: string
  count: number
}

export function DealsFunnelChart({ data }: { data: DealsByStageData[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: STAGE_LABELS[d.stage] || d.stage,
  }))

  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base">Pipeline Deals</CardTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <defs>
              <linearGradient id="gradDeals" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={75} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((value: number, name: string) => {
                if (name === 'value') return formatCurrency(value)
                return value
              }) as any}
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }}
            />
            <Bar dataKey="count" fill="url(#gradDeals)" radius={[0, 6, 6, 0]} name="Deals" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function WonDealsChart({ data }: { data: WonDealsData[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base">Deals Vinti (6 mesi)</CardTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ left: -10, right: 5 }}>
            <defs>
              <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={35} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip formatter={((value: number) => formatCurrency(value)) as any} contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 6 }} name="Valore" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function InteractionsByTypeChart({ data }: { data: InteractionsByTypeData[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: INTERACTION_TYPE_LABELS[d.type] || d.type,
    color: INTERACTION_COLORS[d.type] || '#6366f1',
  }))

  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base">Interazioni per Tipo</CardTitle>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="count"
                nameKey="label"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1.5">
            {chartData.map((item) => (
              <div key={item.type} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted">{item.label}</span>
                </div>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
