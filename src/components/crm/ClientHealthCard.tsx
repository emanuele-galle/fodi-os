'use client'

import { useFetch } from '@/hooks/useFetch'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Activity } from 'lucide-react'

interface HealthData {
  overallScore: number
  interactionScore: number
  pipelineScore: number
  projectScore: number
  revenueScore: number
  engagementScore: number
  riskLevel: string
  lastCalculatedAt: string
  scoreHistory: { date: string; score: number }[] | null
}

const RISK_COLORS: Record<string, string> = {
  HEALTHY: 'text-emerald-500',
  AT_RISK: 'text-amber-500',
  CRITICAL: 'text-red-500',
  CHURNING: 'text-red-600',
}

const RISK_BG: Record<string, string> = {
  HEALTHY: 'bg-emerald-500',
  AT_RISK: 'bg-amber-500',
  CRITICAL: 'bg-red-500',
  CHURNING: 'bg-red-600',
}

const RISK_LABELS: Record<string, string> = {
  HEALTHY: 'Sano',
  AT_RISK: 'A rischio',
  CRITICAL: 'Critico',
  CHURNING: 'Abbandono',
}

const SUB_SCORES = [
  { key: 'interactionScore' as const, label: 'Interazioni', weight: '30%' },
  { key: 'pipelineScore' as const, label: 'Trattative', weight: '25%' },
  { key: 'projectScore' as const, label: 'Progetti', weight: '20%' },
  { key: 'revenueScore' as const, label: 'Fatturato', weight: '15%' },
  { key: 'engagementScore' as const, label: 'Coinvolgimento', weight: '10%' },
] as const

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  if (score >= 30) return 'bg-red-400'
  return 'bg-red-600'
}

interface ClientHealthCardProps {
  clientId: string
}

export function ClientHealthCard({ clientId }: ClientHealthCardProps) {
  const { data, loading } = useFetch<{ success: boolean; data: HealthData }>(
    `/api/clients/${clientId}/health`,
  )

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.success) return null

  const health = data.data
  const riskColor = RISK_COLORS[health.riskLevel] || RISK_COLORS.HEALTHY
  const riskBg = RISK_BG[health.riskLevel] || RISK_BG.HEALTHY
  const riskLabel = RISK_LABELS[health.riskLevel] || health.riskLevel

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Indice di Salute</h3>
        </div>

        <div className="flex items-center gap-4 mb-4">
          {/* Score circle */}
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/20"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={riskColor}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${health.overallScore}, 100`}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${riskColor}`}>
              {health.overallScore}
            </span>
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full text-white ${riskBg}`}>
              {riskLabel}
            </span>
            <p className="text-xs text-muted mt-1">
              Aggiornato {new Date(health.lastCalculatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="space-y-2">
          {SUB_SCORES.map(({ key, label, weight }) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted">{label} <span className="text-muted/50">({weight})</span></span>
                <span className="font-medium tabular-nums">{health[key]}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic runtime value */}
                <div
                  className={`h-full rounded-full transition-all ${scoreBarColor(health[key])}`}
                  style={{ width: `${health[key]}%` }}
                />
                {/* eslint-enable react-perf/jsx-no-new-object-as-prop */}
              </div>
            </div>
          ))}
        </div>

        {/* Trend sparkline */}
        {health.scoreHistory && health.scoreHistory.length > 1 && (
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-[10px] text-muted mb-1">Trend (ultimi mesi)</p>
            <div className="flex items-end gap-1 h-6">
              {health.scoreHistory.map((h) => (
                <div
                  key={h.date}
                  className={`flex-1 rounded-sm ${scoreBarColor(h.score)} opacity-70`}
                  title={`${h.date}: ${h.score}`}
                  /* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic runtime value */
                  style={{ height: `${Math.max(h.score * 0.24, 2)}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
