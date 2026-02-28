'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const TrendChart = dynamic(() => import('@/app/(dashboard)/erp/dashboard/statistics/TrendChart'), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })

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

interface ProfitGoal {
  month: number
  amount: string
}

export function StatisticsDashboard() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [months, setMonths] = useState<MonthStats[]>([])
  const [goals, setGoals] = useState<ProfitGoal[]>([])
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch data on year change
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/accounting/statistics?year=${year}`).then(r => r.json()),
      fetch(`/api/profit-goals?year=${year}`).then(r => r.json()),
    ])
      .then(([statsData, goalsData]) => {
        setMonths(statsData.data?.months || [])
        setGoals(goalsData.items || [])
      })
      .finally(() => setLoading(false))
  }, [year])

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i
    return { value: String(y), label: String(y) }
  })

  const totals = months.reduce(
    (acc, m) => ({
      incomeGross: acc.incomeGross + m.incomeGross,
      expenseGross: acc.expenseGross + m.expenseGross,
      profit: acc.profit + m.profit,
      vatCollected: acc.vatCollected + m.vatCollected,
      vatDeductible: acc.vatDeductible + m.vatDeductible,
      vatBalance: acc.vatBalance + m.vatBalance,
    }),
    { incomeGross: 0, expenseGross: 0, profit: 0, vatCollected: 0, vatDeductible: 0, vatBalance: 0 }
  )

  return (
    <>
      <div className="mb-6">
        <Select label="Anno" options={years} value={String(year)} onChange={e => setYear(parseInt(e.target.value))} className="w-36" />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {/* Trend Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Trend Profitto Mensile</CardTitle>
              <CardDescription>Entrate vs Spese per mese</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart months={months} />
            </CardContent>
          </Card>

          {/* Monthly Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase sticky left-0 bg-card z-10">Voce</th>
                      {MONTH_LABELS.map(m => (
                        <th key={m} className="px-3 py-3 text-right text-xs font-medium text-muted uppercase min-w-[90px]">{m}</th>
                      ))}
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase min-w-[100px] bg-secondary/5">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row label="Entrate Lorde" values={months.map(m => m.incomeGross)} total={totals.incomeGross} className="text-emerald-600" />
                    <Row label="Spese Lorde" values={months.map(m => m.expenseGross)} total={totals.expenseGross} className="text-red-500" />
                    <Row label="Entrate Nette" values={months.map(m => m.incomeNet)} total={totals.incomeGross - totals.vatCollected} />
                    <Row label="Spese Nette" values={months.map(m => m.expenseNet)} total={totals.expenseGross - totals.vatDeductible} />
                    <Row label="Profitto" values={months.map(m => m.profit)} total={totals.profit} bold className="border-t border-border/30" />
                    <GoalRow label="Obiettivo" months={months} goals={goals} />
                    <AchievementRow label="% Raggiungimento" months={months} goals={goals} />
                    <Row label="IVA Incassata" values={months.map(m => m.vatCollected)} total={totals.vatCollected} />
                    <Row label="IVA Detraibile" values={months.map(m => m.vatDeductible)} total={totals.vatDeductible} />
                    <Row label="IVA da Versare" values={months.map(m => m.vatBalance)} total={totals.vatBalance} bold className="border-t border-border/30" />
                    <Row label="Liquidità Stimata" values={months.map(m => m.estimatedLiquidity)} total={months[11]?.estimatedLiquidity || 0} bold className="border-t-2 border-border/30 bg-secondary/5" />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

function Row({ label, values, total, bold, className = '' }: { label: string; values: number[]; total: number; bold?: boolean; className?: string }) {
  return (
    <tr className={`border-b border-border/10 ${className}`}>
      <td className={`px-3 py-2.5 sticky left-0 bg-card z-10 ${bold ? 'font-semibold' : ''}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`px-3 py-2.5 text-right tabular-nums ${bold ? 'font-semibold' : ''} ${v < 0 ? 'text-red-500' : ''}`}>
          {v === 0 ? '—' : formatCurrency(v)}
        </td>
      ))}
      <td className={`px-3 py-2.5 text-right tabular-nums bg-secondary/5 ${bold ? 'font-bold' : 'font-medium'} ${total < 0 ? 'text-red-500' : ''}`}>
        {formatCurrency(total)}
      </td>
    </tr>
  )
}

function GoalRow({ label, months, goals }: { label: string; months: MonthStats[]; goals: ProfitGoal[] }) {
  const goalMap = new Map(goals.map(g => [g.month, parseFloat(g.amount)]))
  const totalGoal = Array.from(goalMap.values()).reduce((s, v) => s + v, 0)

  return (
    <tr className="border-b border-border/10">
      <td className="px-3 py-2.5 sticky left-0 bg-card z-10 text-muted">{label}</td>
      {months.map((_, i) => {
        const v = goalMap.get(i + 1) || 0
        return (
          <td key={i} className="px-3 py-2.5 text-right tabular-nums text-muted">
            {v === 0 ? '—' : formatCurrency(v)}
          </td>
        )
      })}
      <td className="px-3 py-2.5 text-right tabular-nums bg-secondary/5 font-medium text-muted">
        {totalGoal === 0 ? '—' : formatCurrency(totalGoal)}
      </td>
    </tr>
  )
}

function pctColor(pct: number) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 70) return 'text-amber-600'
  return 'text-red-500'
}

function AchievementRow({ label, months, goals }: { label: string; months: MonthStats[]; goals: ProfitGoal[] }) {
  const goalMap = new Map(goals.map(g => [g.month, parseFloat(g.amount)]))
  const totalGoal = Array.from(goalMap.values()).reduce((s, v) => s + v, 0)
  const totalProfit = months.reduce((s, m) => s + m.profit, 0)
  const totalPct = totalGoal > 0 ? (totalProfit / totalGoal) * 100 : 0

  return (
    <tr className="border-b border-border/10">
      <td className="px-3 py-2.5 sticky left-0 bg-card z-10 text-muted">{label}</td>
      {months.map((m, i) => {
        const goal = goalMap.get(i + 1) || 0
        const pct = goal > 0 ? (m.profit / goal) * 100 : 0
        return (
          <td key={i} className={`px-3 py-2.5 text-right tabular-nums font-medium ${goal > 0 ? pctColor(pct) : 'text-muted'}`}>
            {goal === 0 ? '—' : `${pct.toFixed(0)}%`}
          </td>
        )
      })}
      <td className={`px-3 py-2.5 text-right tabular-nums bg-secondary/5 font-bold ${totalGoal > 0 ? pctColor(totalPct) : 'text-muted'}`}>
        {totalGoal === 0 ? '—' : `${totalPct.toFixed(0)}%`}
      </td>
    </tr>
  )
}
