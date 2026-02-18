'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, AlertCircle, CalendarDays, Filter } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

const MonthlyTrendChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.MonthlyTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
})
const HoursPerProjectChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.HoursPerProjectChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
})
const ExpensePieChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.ExpensePieChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
})
const DealsPipelineChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.DealsPipelineChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
})
const TeamPerformanceTable = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.TeamPerformanceTable })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full rounded-xl" />,
})

interface KPI {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  hoursLogged: number
  quotesEmitted: number
  quotesValue: number
  expensesTotal: number
  activeClients: number
  openDeals: number
  completionRate: number
}

interface Project {
  id: string
  name: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverviewData = { kpi: KPI } & Record<string, any>

function getDefaultDateRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export default function ReportsPage() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)


  useEffect(() => {
    fetch('/api/projects?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.items) setProjects(d.items) })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ dateFrom, dateTo })
      if (projectId) params.set('projectId', projectId)
      const res = await fetch(`/api/analytics/overview?${params}`)
      if (!res.ok) throw new Error('Errore nel caricamento')
      setData(await res.json())
    } catch {
      setFetchError('Errore di rete nel caricamento dei report')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, projectId])

  useEffect(() => { loadData() }, [loadData])


  const kpi = data?.kpi

  const kpiCards = kpi ? [
    { label: 'Task Completate', value: `${kpi.completedTasks}/${kpi.totalTasks}`, sub: `${kpi.overdueTasks} in ritardo`, color: 'text-emerald-600' },
    { label: 'Ore Loggate', value: `${kpi.hoursLogged}h`, sub: 'nel periodo', color: 'text-blue-600' },
    { label: 'Preventivi', value: String(kpi.quotesEmitted), sub: formatCurrency(kpi.quotesValue), color: 'text-violet-600' },
    { label: 'Spese', value: formatCurrency(kpi.expensesTotal), sub: 'nel periodo', color: 'text-red-500' },
    { label: 'Clienti Attivi', value: String(kpi.activeClients), sub: `${kpi.openDeals} deal aperti`, color: 'text-amber-600' },
    { label: 'Tasso Completamento', value: `${kpi.completionRate}%`, sub: 'task', color: kpi.completionRate >= 70 ? 'text-emerald-600' : kpi.completionRate >= 40 ? 'text-amber-600' : 'text-red-500' },
  ] : []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 md:p-2.5 rounded-xl flex-shrink-0 bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Analytics & Report</h1>
            <p className="text-xs md:text-sm text-muted">KPI, grafici interattivi e performance team</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-sm border border-border/40 rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-muted text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-sm border border-border/40 rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="text-sm border border-border/40 rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tutti i progetti</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={loadData} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      <div id="report-content">
        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
            {kpiCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="!p-3 md:!p-4">
                  <p className="text-xs text-muted truncate mb-1">{card.label}</p>
                  <p className={`text-lg md:text-xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
                  <p className="text-[11px] text-muted mt-0.5">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[310px] rounded-xl" />)}
          </div>
        ) : data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
            <MonthlyTrendChart data={data.monthlyTrend} />
            <HoursPerProjectChart data={data.hoursPerProject} />
            <ExpensePieChart data={data.expensesByCategory} />
            <DealsPipelineChart data={data.dealsPipeline} />
          </div>
        )}

        {/* Team Performance */}
        {!loading && data && (
          <TeamPerformanceTable data={data.byUser} />
        )}
      </div>
    </div>
  )
}
