"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"

interface DataPoint {
  name: string
  value: number
  [key: string]: string | number
}

interface AreaChartProps {
  data?: DataPoint[]
  className?: string
  height?: number
  showGrid?: boolean
  color?: string
  gradientId?: string
}

const defaultData: DataPoint[] = [
  { name: "Gen", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Apr", value: 4500 },
  { name: "Mag", value: 6000 },
  { name: "Giu", value: 5500 },
  { name: "Lug", value: 7000 },
  { name: "Ago", value: 6500 },
  { name: "Set", value: 8000 },
  { name: "Ott", value: 7500 },
  { name: "Nov", value: 9000 },
  { name: "Dic", value: 8500 },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

export function AreaCharts1({
  data = defaultData,
  className,
  height = 280,
  showGrid = true,
  color = "var(--color-primary)",
  gradientId = "areaGradient1",
}: AreaChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="4 8"
              vertical={false}
              stroke="var(--color-border)"
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            stroke="transparent"
          />
          <YAxis
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            stroke="transparent"
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              stroke: color,
              strokeDasharray: "4 4",
              strokeOpacity: 0.5,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: "white",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export { AreaCharts1 as Component }
