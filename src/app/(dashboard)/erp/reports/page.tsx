'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, AlertCircle, CalendarDays, Filter, Download } from 'lucide-react'
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
const IncomeExpenseBarChart = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.IncomeExpenseBarChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
})
const ProfitTrendLine = dynamic(() => import('@/components/erp/ReportsCharts').then(m => ({ default: m.ProfitTrendLine })), {
  ssr: false,
  loading: () => <Skeleton className="h-[310px] w-full rounded-xl" />,
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

interface MonthStats {
  month: number
  profit: number
  incomeNet: number
  expenseNet: number
  incomeGross: number
  expenseGross: number
  vatCollected: number
  vatDeductible: number
  vatBalance: number
  estimatedLiquidity: number
}

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

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
  const [activeTab, setActiveTab] = useState<'overview' | 'accounting'>('overview')

  // Overview state
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Accounting state
  const [acctYear, setAcctYear] = useState(new Date().getFullYear())
  const [acctMonths, setAcctMonths] = useState<MonthStats[]>([])
  const [acctLoading, setAcctLoading] = useState(false)
  const [acctError, setAcctError] = useState<string | null>(null)

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

  // Load accounting data when tab is active or year changes
  useEffect(() => {
    if (activeTab !== 'accounting') return
    setAcctLoading(true)
    setAcctError(null)
    fetch(`/api/accounting/statistics?year=${acctYear}`)
      .then(r => {
        if (!r.ok) throw new Error('Errore')
        return r.json()
      })
      .then(d => setAcctMonths(d.data?.months || []))
      .catch(() => setAcctError('Errore nel caricamento dei dati contabili'))
      .finally(() => setAcctLoading(false))
  }, [activeTab, acctYear])

  const kpi = data?.kpi

  const kpiCards = kpi ? [
    { label: 'Task Completate', value: `${kpi.completedTasks}/${kpi.totalTasks}`, sub: `${kpi.overdueTasks} in ritardo`, color: 'text-emerald-600' },
    { label: 'Ore Loggate', value: `${kpi.hoursLogged}h`, sub: 'nel periodo', color: 'text-blue-600' },
    { label: 'Preventivi', value: String(kpi.quotesEmitted), sub: formatCurrency(kpi.quotesValue), color: 'text-violet-600' },
    { label: 'Spese', value: formatCurrency(kpi.expensesTotal), sub: 'nel periodo', color: 'text-red-500' },
    { label: 'Clienti Attivi', value: String(kpi.activeClients), sub: `${kpi.openDeals} deal aperti`, color: 'text-amber-600' },
    { label: 'Tasso Completamento', value: `${kpi.completionRate}%`, sub: 'task', color: kpi.completionRate >= 70 ? 'text-emerald-600' : kpi.completionRate >= 40 ? 'text-amber-600' : 'text-red-500' },
  ] : []

  // Accounting derived data
  const acctTotals = acctMonths.reduce(
    (acc, m) => ({
      incomeGross: acc.incomeGross + m.incomeGross,
      expenseGross: acc.expenseGross + m.expenseGross,
      profit: acc.profit + m.profit,
      vatBalance: acc.vatBalance + m.vatBalance,
    }),
    { incomeGross: 0, expenseGross: 0, profit: 0, vatBalance: 0 }
  )

  const barChartData = acctMonths.map(m => ({
    month: MONTH_LABELS[m.month - 1] || `M${m.month}`,
    income: m.incomeGross,
    expense: m.expenseGross,
  }))

  const profitChartData = acctMonths.map(m => ({
    month: MONTH_LABELS[m.month - 1] || `M${m.month}`,
    profit: m.profit,
  }))

  const acctYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  function exportCSV() {
    const headers = ['Mese', 'Entrate Lorde', 'Spese Lorde', 'Profitto', 'IVA Incassata', 'IVA Detraibile', 'IVA da Versare', 'Liquidita Stimata']
    const rows = acctMonths.map(m => [
      MONTH_LABELS[m.month - 1],
      m.incomeGross.toFixed(2),
      m.expenseGross.toFixed(2),
      m.profit.toFixed(2),
      m.vatCollected.toFixed(2),
      m.vatDeductible.toFixed(2),
      m.vatBalance.toFixed(2),
      m.estimatedLiquidity.toFixed(2),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contabilita_${acctYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const acctSummaryCards = [
    { label: 'Entrate Totali', value: formatCurrency(acctTotals.incomeGross), color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Spese Totali', value: formatCurrency(acctTotals.expenseGross), color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Profitto Netto', value: formatCurrency(acctTotals.profit), color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'IVA da Versare', value: formatCurrency(acctTotals.vatBalance), color: 'text-amber-600', bg: 'bg-amber-500/10' },
  ]

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab('accounting')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'accounting'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Contabilit&agrave;
        </button>
      </div>

      {/* ── Tab: Panoramica ── */}
      {activeTab === 'overview' && (
        <>
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
              <span className="text-muted text-sm">&mdash;</span>
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
                      <p className="text-xs text-muted mt-0.5">{card.sub}</p>
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
        </>
      )}

      {/* ── Tab: Contabilita ── */}
      {activeTab === 'accounting' && (
        <>
          {/* Year selector + Export */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted" />
              <select
                value={acctYear}
                onChange={e => setAcctYear(parseInt(e.target.value))}
                className="text-sm border border-border/40 rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {acctYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={exportCSV}
              disabled={acctLoading || acctMonths.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border/40 bg-card hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {acctError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{acctError}</p>
            </div>
          )}

          {acctLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-[340px] rounded-xl" />
                <Skeleton className="h-[340px] rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                {acctSummaryCards.map((card) => (
                  <Card key={card.label}>
                    <CardContent className="!p-3 md:!p-4">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${card.bg} ${card.color} mb-2`}>
                        {card.label}
                      </div>
                      <p className={`text-lg md:text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
                      <p className="text-xs text-muted mt-0.5">{acctYear}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <IncomeExpenseBarChart data={barChartData} />
                <ProfitTrendLine data={profitChartData} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
