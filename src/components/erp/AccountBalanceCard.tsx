'use client'

import { formatCurrency } from '@/lib/utils'

interface AccountSummary {
  totalIncome: number
  totalExpenses: number
  transfersIn: number
  transfersOut: number
}

interface AccountBalanceCardProps {
  name: string
  type: string
  icon?: string | null
  balance: number
  isActive?: boolean
  summary?: AccountSummary | null
  realBalance?: number | null
  onRealBalanceChange?: (value: number) => void
}

const TYPE_LABELS: Record<string, string> = {
  bank: 'Conto Corrente',
  credit_card: 'Carta di Credito',
  cash: 'Contanti',
}

export function AccountBalanceCard({
  name,
  type,
  icon,
  balance,
  isActive = true,
  summary,
  realBalance,
  onRealBalanceChange,
}: AccountBalanceCardProps) {
  const calculatedBalance = summary
    ? balance + summary.totalIncome - summary.totalExpenses + summary.transfersIn - summary.transfersOut
    : null

  const delta = realBalance != null && calculatedBalance != null
    ? realBalance - calculatedBalance
    : null

  return (
    <div className={`rounded-xl border p-4 ${isActive ? 'border-border bg-card' : 'border-border/50 bg-secondary/5 opacity-60'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon || (type === 'bank' ? '🏛️' : type === 'credit_card' ? '💳' : '💵')}</span>
        <div className="min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-xs text-muted">{TYPE_LABELS[type] || type}</p>
        </div>
      </div>

      <p className={`text-xl font-bold tabular-nums ${balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {formatCurrency(balance)}
      </p>

      {summary && (
        <div className="mt-3 pt-3 border-t border-border/20 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Entrate</span>
            <span className="text-emerald-600 font-medium tabular-nums">+{formatCurrency(summary.totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Uscite</span>
            <span className="text-red-500 font-medium tabular-nums">-{formatCurrency(summary.totalExpenses)}</span>
          </div>
          {summary.transfersIn > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Giroconti In</span>
              <span className="text-blue-500 font-medium tabular-nums">+{formatCurrency(summary.transfersIn)}</span>
            </div>
          )}
          {summary.transfersOut > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Giroconti Out</span>
              <span className="text-amber-500 font-medium tabular-nums">-{formatCurrency(summary.transfersOut)}</span>
            </div>
          )}
          {calculatedBalance != null && (
            <div className="flex justify-between pt-1.5 border-t border-border/10">
              <span className="text-muted font-medium">Saldo calcolato</span>
              <span className={`font-semibold tabular-nums ${calculatedBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(calculatedBalance)}
              </span>
            </div>
          )}
        </div>
      )}

      {onRealBalanceChange && (
        <div className="mt-3 pt-3 border-t border-border/20">
          <label className="text-xs text-muted block mb-1">Saldo reale (verifica)</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border/30 bg-secondary/5 px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/30"
            defaultValue={realBalance ?? ''}
            onBlur={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) onRealBalanceChange(val)
            }}
          />
          {delta != null && delta !== 0 && (
            <p className={`text-xs mt-1 font-medium ${Math.abs(delta) < 1 ? 'text-amber-500' : 'text-red-500'}`}>
              Delta: {delta > 0 ? '+' : ''}{formatCurrency(delta)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
