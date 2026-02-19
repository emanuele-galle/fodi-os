'use client'

import { formatCurrency } from '@/lib/utils'

export interface AccountingColumn {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  format?: 'currency' | 'percentage' | 'date' | 'checkbox'
  hidden?: boolean
}

interface AccountingTableProps {
  columns: AccountingColumn[]
  data: Record<string, unknown>[]
  showTotals?: boolean
  totalKeys?: string[]
  onRowClick?: (row: Record<string, unknown>) => void
  actions?: (row: Record<string, unknown>) => React.ReactNode
}

export function AccountingTable({ columns, data, showTotals, totalKeys = [], onRowClick, actions }: AccountingTableProps) {
  const visibleColumns = columns.filter(c => !c.hidden)

  const formatCell = (col: AccountingColumn, value: unknown) => {
    if (value === null || value === undefined) return '\u2014'
    if (col.format === 'currency') return formatCurrency(Number(value))
    if (col.format === 'percentage') return `${value}%`
    if (col.format === 'date') return new Date(String(value)).toLocaleDateString('it-IT')
    if (col.format === 'checkbox') return value ? '✅' : '⬜'
    return String(value)
  }

  const totals = totalKeys.length > 0 ? totalKeys.reduce((acc, key) => {
    acc[key] = data.reduce((sum, row) => sum + Number(row[key] || 0), 0)
    return acc
  }, {} as Record<string, number>) : null

  return (
    <div className="rounded-xl border border-border/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {visibleColumns.map(col => (
                <th key={col.key} className={`px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/10 hover:bg-secondary/8 transition-colors even:bg-secondary/[0.03] ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {visibleColumns.map(col => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : ''} ${col.format === 'currency' ? 'font-medium' : ''}`}>
                    {formatCell(col, row[col.key])}
                  </td>
                ))}
                {actions && <td className="px-4 py-3.5 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-border/30 bg-secondary/5 font-semibold">
                {visibleColumns.map((col, i) => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {i === 0 ? 'Totale' : totals[col.key] !== undefined ? formatCurrency(totals[col.key]) : ''}
                  </td>
                ))}
                {actions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
