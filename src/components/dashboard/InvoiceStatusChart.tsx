'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent } from '@/components/ui/Card'
import { Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ChartSegment {
  label: string
  value: number
  color: string
}

interface InvoiceStatusChartProps {
  data: ChartSegment[]
  total: number
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: item.payload.color }} />
        <span className="text-xs text-muted">{item.name}</span>
      </div>
      <p className="text-sm font-semibold mt-0.5">{formatCurrency(item.value)}</p>
    </div>
  )
}

export function InvoiceStatusChart({ data, total }: InvoiceStatusChartProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold">Distribuzione Fatture</h3>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">Nessuna fattura trovata.</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="label"
                    strokeWidth={0}
                  >
                    {data.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-[10px] text-muted uppercase tracking-wider">Totale</p>
                  <p className="text-base font-bold">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3">
              {data.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-muted">{seg.label}: {formatCurrency(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
