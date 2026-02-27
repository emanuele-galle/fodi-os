'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp, TrendingDown, AlertCircle, Building2, FileWarning } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { CategoryBreakdownTable } from '@/components/erp/CategoryBreakdownTable'
import { useTableSort, sortData } from '@/hooks/useTableSort'

const DonutChart = dynamic(
  () => import('@/components/erp/DonutChart').then(m => ({ default: m.DonutChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full rounded-xl" /> }
)

const DonutLegend = dynamic(
  () => import('@/components/erp/DonutChart').then(m => ({ default: m.DonutLegend })),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full rounded-xl" /> }
)

/* ---------- Types ---------- */

interface CategoryItem {
  category: string
  gross: number
  vat: number
  net: number
  percentage: number
}

interface IncomeData {
  totalGross: number
  totalNet: number
  totalVat: number
  byCategory: CategoryItem[]
}

interface ExpenseData {
  totalGross: number
  totalNet: number
  totalVatDeductible: number
  byCategory: CategoryItem[]
}

interface PendingInvoice {
  id: string
  clientName: string
  date: string
  amount: number
  category: string
}

interface DashboardData {
  income: IncomeData
  expense: ExpenseData
  profitNet: number
  comparison: {
    prevIncomeGross: number
    prevExpenseGross: number
    deltaIncome: number
    deltaExpense: number
  }
  pendingInvoices: PendingInvoice[]
}

interface BusinessEntity {
  id: string
  name: string
}

/* ---------- Helpers ---------- */

const DONUT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(Number(y), Number(m) - 1)
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

/* ---------- Component ---------- */

export function MonthlyDashboard() {
  const [month, setMonth] = useState(getCurrentMonth)
  const [entityId, setEntityId] = useState('')
  const [entities, setEntities] = useState<BusinessEntity[]>([])
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goalAmount, setGoalAmount] = useState<number | null>(null)

  const { sortKey: piSortKey, sortDir: piSortDir, handleSort: piHandleSort, sortIcon: piSortIcon } = useTableSort('date', 'asc')

  const sortedPendingInvoices = useMemo(
    () => data?.pendingInvoices ? sortData(data.pendingInvoices, piSortKey, piSortDir) : [],
    [data?.pendingInvoices, piSortKey, piSortDir]
  )

  /* Load business entities */
  useEffect(() => {
    fetch('/api/business-entities')
      .then(r => (r.ok ? r.json() : []))
      .then(d => {
        const items = Array.isArray(d) ? d : d.items ?? d.data ?? []
        setEntities(items)
      })
      .catch(() => {})
  }, [])

  /* Load profit goal for current month */
  useEffect(() => {
    const [y, m] = month.split('-').map(Number)
    fetch(`/api/profit-goals?year=${y}`)
      .then(r => r.json())
      .then(d => {
        const goal = (d.items || []).find((g: { month: number }) => g.month === m)
        setGoalAmount(goal ? parseFloat(goal.amount) : null)
      })
      .catch(() => setGoalAmount(null))
  }, [month])

  /* Load dashboard data */
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: 'monthly', month })
      if (entityId) params.set('entityId', entityId)
      const res = await fetch(`/api/accounting/dashboard?${params}`)
      if (!res.ok) throw new Error('Errore nel caricamento dei dati')
      const json = await res.json()
      setData(json.data ?? json)
    } catch {
      setError('Impossibile caricare la dashboard. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [month, entityId])

  useEffect(() => { loadData() }, [loadData])

  /* Derived values */
  const vatNet = data ? data.income.totalVat - data.expense.totalVatDeductible : 0
  const profitPositive = data ? data.profitNet >= 0 : true

  const incomeChartData = data?.income.byCategory.map((c, i) => ({
    name: c.category,
    value: c.gross,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    percentage: c.percentage,
  })) ?? []

  const expenseChartData = data?.expense.byCategory.map((c, i) => ({
    name: c.category,
    value: c.gross,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    percentage: c.percentage,
  })) ?? []

  const entityOptions = [
    { value: '', label: 'Tutte le entità' },
    ...entities.map(e => ({ value: e.id, label: e.name })),
  ]

  return (
    <>
      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Mese</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="flex h-11 md:h-10 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted mt-6" />
          <Select
            label="Entità"
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            options={entityOptions}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button onClick={loadData} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">
            Riprova
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {/* Entrate Lorde */}
          <Card>
            <CardContent className="!p-4">
              <p className="text-xs text-muted mb-1">Entrate Lorde</p>
              <p className="text-lg md:text-xl font-bold tabular-nums text-emerald-600">
                {formatCurrency(data.income.totalGross)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Netto: {formatCurrency(data.income.totalNet)}
              </p>
            </CardContent>
          </Card>

          {/* Spese Lorde */}
          <Card>
            <CardContent className="!p-4">
              <p className="text-xs text-muted mb-1">Spese Lorde</p>
              <p className="text-lg md:text-xl font-bold tabular-nums text-red-500">
                {formatCurrency(data.expense.totalGross)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Netto: {formatCurrency(data.expense.totalNet)}
              </p>
            </CardContent>
          </Card>

          {/* Profitto Netto */}
          <Card>
            <CardContent className="!p-4">
              <p className="text-xs text-muted mb-1">Profitto Netto</p>
              <p className={`text-lg md:text-xl font-bold tabular-nums ${profitPositive ? 'text-blue-600' : 'text-red-500'}`}>
                {formatCurrency(data.profitNet)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {profitPositive ? 'In positivo' : 'In negativo'}
              </p>
            </CardContent>
          </Card>

          {/* IVA Netta */}
          <Card>
            <CardContent className="!p-4">
              <p className="text-xs text-muted mb-1">IVA Netta</p>
              <p className="text-lg md:text-xl font-bold tabular-nums text-amber-600">
                {formatCurrency(vatNet)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Incassata - Detraibile
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Obiettivo Profitto - Progress Bar */}
      {!loading && data && goalAmount !== null && goalAmount > 0 && (() => {
        const actualPct = (data.profitNet / goalAmount) * 100
        const barPct = Math.min(actualPct, 100)
        const color = actualPct >= 100 ? 'bg-emerald-500' : actualPct >= 70 ? 'bg-amber-500' : 'bg-red-500'
        const textColor = actualPct >= 100 ? 'text-emerald-600' : actualPct >= 70 ? 'text-amber-600' : 'text-red-500'
        return (
          <Card className="mb-6">
            <CardContent className="!p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted uppercase">Obiettivo Profitto Mensile</p>
                <p className={`text-sm font-bold tabular-nums ${textColor}`}>{actualPct.toFixed(0)}%</p>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-3 mb-2">
                <div className={`h-3 rounded-full transition-all duration-500 ${color}`} style={{ width: `${barPct}%` }} />
              </div>
              <p className={`text-sm tabular-nums ${textColor}`}>
                {formatCurrency(data.profitNet)} di {formatCurrency(goalAmount)} obiettivo
              </p>
            </CardContent>
          </Card>
        )
      })()}

      {/* Comparison with previous period */}
      {!loading && data && (
        <Card className="mb-6">
          <CardContent className="!p-4">
            <p className="text-xs font-medium text-muted uppercase mb-3">Confronto con mese precedente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Delta Income */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.comparison.deltaIncome >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {data.comparison.deltaIncome >= 0
                    ? <TrendingUp className="h-5 w-5 text-emerald-600" />
                    : <TrendingDown className="h-5 w-5 text-red-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">Entrate</p>
                  <p className={`text-sm font-bold tabular-nums ${data.comparison.deltaIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {data.comparison.deltaIncome >= 0 ? '+' : ''}{formatCurrency(data.comparison.deltaIncome)}
                  </p>
                  <p className="text-xs text-muted">
                    Prec.: {formatCurrency(data.comparison.prevIncomeGross)}
                  </p>
                </div>
              </div>

              {/* Delta Expense */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.comparison.deltaExpense <= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {data.comparison.deltaExpense <= 0
                    ? <TrendingDown className="h-5 w-5 text-emerald-600" />
                    : <TrendingUp className="h-5 w-5 text-red-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">Spese</p>
                  <p className={`text-sm font-bold tabular-nums ${data.comparison.deltaExpense <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {data.comparison.deltaExpense >= 0 ? '+' : ''}{formatCurrency(data.comparison.deltaExpense)}
                  </p>
                  <p className="text-xs text-muted">
                    Prec.: {formatCurrency(data.comparison.prevExpenseGross)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donut Charts - Income & Expenses */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
        </div>
      ) : data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Income Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Entrate per Categoria</CardTitle>
              <CardDescription>Distribuzione entrate lorde</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeChartData.length > 0 ? (
                <>
                  <DonutChart
                    data={incomeChartData}
                    total={data.income.totalGross}
                    label="Lordo"
                  />
                  <DonutLegend data={incomeChartData} />
                </>
              ) : (
                <p className="text-sm text-muted text-center py-8">Nessuna entrata nel periodo</p>
              )}
            </CardContent>
          </Card>

          {/* Expense Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Spese per Categoria</CardTitle>
              <CardDescription>Distribuzione spese lorde</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseChartData.length > 0 ? (
                <>
                  <DonutChart
                    data={expenseChartData}
                    total={data.expense.totalGross}
                    label="Lordo"
                  />
                  <DonutLegend data={expenseChartData} />
                </>
              ) : (
                <p className="text-sm text-muted text-center py-8">Nessuna spesa nel periodo</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown Tables */}
      {!loading && data && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dettaglio Entrate per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {data.income.byCategory.length > 0 ? (
                <CategoryBreakdownTable data={data.income.byCategory} type="income" />
              ) : (
                <p className="text-sm text-muted text-center py-4">Nessuna entrata nel periodo</p>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dettaglio Spese per Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expense.byCategory.length > 0 ? (
                <CategoryBreakdownTable data={data.expense.byCategory} type="expense" />
              ) : (
                <p className="text-sm text-muted text-center py-4">Nessuna spesa nel periodo</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Pending Invoices */}
      {!loading && data && data.pendingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              <CardTitle>Fatture in Attesa di Pagamento</CardTitle>
            </div>
            <CardDescription>{data.pendingInvoices.length} fatture non saldate</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {sortedPendingInvoices.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{inv.clientName}</span>
                    <span className="font-bold text-sm tabular-nums">{formatCurrency(inv.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{inv.category}</span>
                    <span>{new Date(inv.date).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border/30 font-semibold text-sm">
                <span>Totale in sospeso</span>
                <span className="tabular-nums">{formatCurrency(data.pendingInvoices.reduce((s, inv) => s + inv.amount, 0))}</span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-border/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => piHandleSort('clientName')}>Cliente{piSortIcon('clientName')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => piHandleSort('date')}>Data{piSortIcon('date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => piHandleSort('category')}>Categoria{piSortIcon('category')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => piHandleSort('amount')}>Importo{piSortIcon('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPendingInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/10 even:bg-secondary/[0.03]">
                      <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(inv.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="px-4 py-3 text-muted">{inv.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatCurrency(inv.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/30 bg-secondary/5 font-semibold">
                    <td className="px-4 py-3" colSpan={3}>Totale in sospeso</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(data.pendingInvoices.reduce((s, inv) => s + inv.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
