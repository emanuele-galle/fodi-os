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
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Receipt className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold">Distribuzione Fatture</h3>
            <p className="text-[11px] text-muted mt-0.5">Per stato</p>
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">Nessuna fattura trovata.</p>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    strokeWidth={0}
                    cornerRadius={3}
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
                  <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Totale</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 gap-2.5 px-2">
              {data.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-foreground">{seg.label}</span>
                    <p className="text-[11px] text-muted tabular-nums">{formatCurrency(seg.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
