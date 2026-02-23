'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { useTableSort, sortData } from '@/hooks/useTableSort'

interface RevenueDataPoint { month: string; revenue: number }
interface ExpenseDataPoint { category: string; amount: number }
interface TrendPoint { month: string; created: number; completed: number }
interface HoursProjectPoint { name: string; hours: number }
interface PipelinePoint { stage: string; count: number; value: number }
interface TeamMember {
  userName: string; assigned: number; completed: number
  overdue: number; hoursLogged: number; completionRate: number
}

const TOOLTIP_STYLE = {
  background: 'var(--color-card)',
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  backdropFilter: 'blur(8px)',
  fontSize: 13,
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#818cf8', '#4f46e5']

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: 'Qualifica',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negoziazione',
}

export function RevenueBarChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Andamento Revenue</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -10, right: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={35} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
            <Bar dataKey="revenue" fill="url(#gradRevenue)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ExpenseBarChart({ data }: { data: ExpenseDataPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Distribuzione Spese</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 5 }}>
            <defs>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis type="number" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis type="category" dataKey="category" width={70} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} stroke="transparent" />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
            <Bar dataKey="amount" fill="url(#gradExpense)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function MonthlyTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Trend Mensile Task</CardTitle>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ left: -10, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={35} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="created" name="Create" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
            <Line type="monotone" dataKey="completed" name="Completate" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function HoursPerProjectChart({ data }: { data: HoursProjectPoint[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle className="mb-4 text-base md:text-lg">Ore per Progetto</CardTitle>
          <p className="text-sm text-muted py-8 text-center">Nessuna ora registrata nel periodo</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Ore per Progetto</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="4 8" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis type="number" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} stroke="transparent" tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '\u2026' : v} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}h`, 'Ore']} labelFormatter={(label) => label} />
            <Bar dataKey="hours" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ExpensePieChart({ data }: { data: ExpenseDataPoint[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle className="mb-4 text-base md:text-lg">Spese per Categoria</CardTitle>
          <p className="text-sm text-muted py-8 text-center">Nessuna spesa nel periodo</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Spese per Categoria</CardTitle>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function DealsPipelineChart({ data }: { data: PipelinePoint[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle className="mb-4 text-base md:text-lg">Pipeline Deals</CardTitle>
          <p className="text-sm text-muted py-8 text-center">Nessun deal aperto</p>
        </CardContent>
      </Card>
    )
  }
  const chartData = data.map(d => ({ ...d, stage: STAGE_LABELS[d.stage] || d.stage }))
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Pipeline Deals</CardTitle>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="stage" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={35} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [name === 'value' ? formatCurrency(Number(value)) : value, name === 'value' ? 'Valore' : 'Deals']} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="count" name="Deals" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/* ── Accounting Charts ── */

interface IncomeExpensePoint { month: string; income: number; expense: number }
interface ProfitPoint { month: string; profit: number }

export function IncomeExpenseBarChart({ data }: { data: IncomeExpensePoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Entrate vs Spese Mensili</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: -10, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={40} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.05 }} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="income" name="Entrate" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Spese" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ProfitTrendLine({ data }: { data: ProfitPoint[] }) {
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Andamento Profitto Mensile</CardTitle>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: -10, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" />
            <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 13, fill: 'var(--color-muted)' }} stroke="transparent" width={40} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey="profit" name="Profitto" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TeamPerformanceTable({ data }: { data: TeamMember[] }) {
  const { sortKey, sortDir, handleSort, sortIcon } = useTableSort('completionRate')
  const sortedData = useMemo(() => sortData(data, sortKey, sortDir), [data, sortKey, sortDir])

  if (data.length === 0) {
    return (
      <Card>
        <CardContent>
          <CardTitle className="mb-4 text-base md:text-lg">Performance Team</CardTitle>
          <p className="text-sm text-muted py-8 text-center">Nessun dato disponibile</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent>
        <CardTitle className="mb-4 text-base md:text-lg">Performance Team</CardTitle>
        <div className="overflow-x-auto -mx-4 md:-mx-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('userName')}>Membro{sortIcon('userName')}</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('assigned')}>Assegnate{sortIcon('assigned')}</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('completed')}>Completate{sortIcon('completed')}</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('overdue')}>In Ritardo{sortIcon('overdue')}</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('hoursLogged')}>Ore{sortIcon('hoursLogged')}</th>
                <th className="text-center py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort('completionRate')}>Tasso{sortIcon('completionRate')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((m) => (
                <tr key={m.userName} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-4 font-medium">{m.userName}</td>
                  <td className="py-2.5 px-3 text-center tabular-nums">{m.assigned}</td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-emerald-600">{m.completed}</td>
                  <td className="py-2.5 px-3 text-center tabular-nums">
                    {m.overdue > 0 ? <span className="text-red-500 font-medium">{m.overdue}</span> : <span className="text-muted">0</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums">{m.hoursLogged}h</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.completionRate >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                      m.completionRate >= 50 ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {m.completionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
