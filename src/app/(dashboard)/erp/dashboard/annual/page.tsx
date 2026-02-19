'use client'

import { useState, useEffect } from 'react'
import { CalendarRange, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const DonutChart = dynamic(() => import('@/components/erp/DonutChart').then(m => ({ default: m.DonutChart })), { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> })
const DonutLegend = dynamic(() => import('@/components/erp/DonutChart').then(m => ({ default: m.DonutLegend })), { ssr: false })
import { CategoryBreakdownTable } from '@/components/erp/CategoryBreakdownTable'

interface DashboardData {
  income: { totalGross: number; totalNet: number; totalVat: number; byCategory: { category: string; gross: number; vat: number; net: number; percentage: number }[] }
  expense: { totalGross: number; totalNet: number; totalVatDeductible: number; byCategory: { category: string; gross: number; vat: number; net: number; percentage: number }[] }
  profitNet: number
  comparison: { prevIncomeGross: number; prevExpenseGross: number; deltaIncome: number; deltaExpense: number }
}

export default function AnnualDashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [entityId, setEntityId] = useState('')
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/business-entities').then(r => r.json()).then(d => setEntities(d.items || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ period: 'annual', year: String(year) })
    if (entityId) params.set('businessEntityId', entityId)
    fetch(`/api/accounting/dashboard?${params}`)
      .then(r => r.json())
      .then(d => setData(d.data || null))
      .finally(() => setLoading(false))
  }, [year, entityId])

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i
    return { value: String(y), label: String(y) }
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 md:p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard Annuale</h1>
          <p className="text-xs md:text-sm text-muted">Panoramica finanziaria annuale</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Select label="Anno" options={years} value={String(year)} onChange={e => setYear(parseInt(e.target.value))} className="w-full sm:w-36" />
        <Select
          label="Attività"
          options={[{ value: '', label: 'Tutte le attività' }, ...entities.map(e => ({ value: e.id, label: e.name }))]}
          value={entityId}
          onChange={e => setEntityId(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted">Entrate Lorde</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(data.income.totalGross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted">Spese Lorde</span>
                </div>
                <p className="text-lg font-bold text-red-500">{formatCurrency(data.expense.totalGross)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  {data.profitNet >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                  <span className="text-xs text-muted">Profitto Netto</span>
                </div>
                <p className={`text-lg font-bold ${data.profitNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(data.profitNet)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted">IVA Netta</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(data.income.totalVat - data.expense.totalVatDeductible)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Comparison */}
          <Card className="mb-6">
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">Confronto anno precedente</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  {data.comparison.deltaIncome >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Entrate: <strong>{data.comparison.deltaIncome >= 0 ? '+' : ''}{formatCurrency(data.comparison.deltaIncome)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {data.comparison.deltaExpense <= 0 ? <ArrowDownRight className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">Spese: <strong>{data.comparison.deltaExpense >= 0 ? '+' : ''}{formatCurrency(data.comparison.deltaExpense)}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Entrate per Categoria</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={data.income.byCategory.map(c => ({ name: c.category, value: c.gross }))}
                  total={data.income.totalGross}
                  label="Totale Entrate"
                />
                <DonutLegend data={data.income.byCategory.map(c => ({ name: c.category, value: c.gross, percentage: c.percentage }))} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Spese per Categoria</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={data.expense.byCategory.map(c => ({ name: c.category, value: c.gross }))}
                  total={data.expense.totalGross}
                  label="Totale Spese"
                />
                <DonutLegend data={data.expense.byCategory.map(c => ({ name: c.category, value: c.gross, percentage: c.percentage }))} />
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Dettaglio Entrate</h3>
              <CategoryBreakdownTable data={data.income.byCategory} type="income" />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Dettaglio Spese</h3>
              <CategoryBreakdownTable data={data.expense.byCategory} type="expense" />
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">Nessun dato disponibile per questo periodo.</p>
      )}
    </div>
  )
}
