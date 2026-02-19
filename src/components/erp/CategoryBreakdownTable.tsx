'use client'

import { formatCurrency } from '@/lib/utils'

interface CategoryRow {
  category: string
  gross: number
  vat: number
  net: number
  percentage: number
}

interface CategoryBreakdownTableProps {
  data: CategoryRow[]
  type: 'income' | 'expense'
}

export function CategoryBreakdownTable({ data, type }: CategoryBreakdownTableProps) {
  const totalGross = data.reduce((s, r) => s + r.gross, 0)
  const totalVat = data.reduce((s, r) => s + r.vat, 0)
  const totalNet = data.reduce((s, r) => s + r.net, 0)

  return (
    <div className="rounded-xl border border-border/20 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Categoria</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Lordo</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">{type === 'income' ? 'IVA' : 'IVA Detr.'}</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Netto</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/10 even:bg-secondary/[0.03]">
              <td className="px-4 py-3">{row.category}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(row.gross)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.vat)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.net)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-muted">{row.percentage}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border/30 bg-secondary/5 font-semibold">
            <td className="px-4 py-3">Totale</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalGross)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalVat)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totalNet)}</td>
            <td className="px-4 py-3 text-right tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
