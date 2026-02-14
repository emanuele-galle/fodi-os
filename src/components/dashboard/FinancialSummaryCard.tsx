'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'motion/react'

interface FinancialSummaryCardProps {
  income: number
  expenses: number
  incomeLabel?: string
  expenseLabel?: string
  onViewDetails?: () => void
}

export function FinancialSummaryCard({
  income,
  expenses,
  incomeLabel = 'Entrate',
  expenseLabel = 'Uscite',
  onViewDetails,
}: FinancialSummaryCardProps) {
  const net = income - expenses
  const isPositive = net >= 0
  const ratio = income > 0 ? Math.min((expenses / income) * 100, 100) : 0

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Riepilogo Finanziario</h3>
              <p className="text-[11px] text-muted mt-0.5">Mese corrente</p>
            </div>
          </div>
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-all"
            >
              Dettagli
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted font-medium uppercase tracking-wider">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              {incomeLabel}
            </div>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(income)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted font-medium uppercase tracking-wider">
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              {expenseLabel}
            </div>
            <p className="text-2xl font-bold text-red-500 tabular-nums">
              {formatCurrency(expenses)}
            </p>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Rapporto uscite/entrate</span>
            <span className="font-medium tabular-nums">{ratio.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratio}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${ratio > 80 ? 'bg-red-500' : ratio > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>

        {/* Net result */}
        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
          <span className="text-sm text-muted">Risultato netto</span>
          <span className={`text-xl font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(net)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
