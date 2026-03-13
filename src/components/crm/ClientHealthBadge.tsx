'use client'

import { useFetch } from '@/hooks/useFetch'

interface HealthData {
  overallScore: number
  riskLevel: string
}

const RISK_STYLES: Record<string, string> = {
  HEALTHY: 'bg-emerald-500/15 text-emerald-600',
  AT_RISK: 'bg-amber-500/15 text-amber-600',
  CRITICAL: 'bg-red-500/15 text-red-600',
  CHURNING: 'bg-red-600/20 text-red-700',
}

const RISK_LABELS: Record<string, string> = {
  HEALTHY: 'Sano',
  AT_RISK: 'A rischio',
  CRITICAL: 'Critico',
  CHURNING: 'Abbandono',
}

interface ClientHealthBadgeProps {
  clientId: string
}

export function ClientHealthBadge({ clientId }: ClientHealthBadgeProps) {
  const { data } = useFetch<{ success: boolean; data: HealthData }>(
    `/api/clients/${clientId}/health`,
  )

  if (!data?.success) return null

  const { overallScore, riskLevel } = data.data
  const style = RISK_STYLES[riskLevel] || RISK_STYLES.HEALTHY
  const label = RISK_LABELS[riskLevel] || riskLevel

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style}`}>
      <span className="tabular-nums">{overallScore}</span>
      <span>{label}</span>
    </span>
  )
}
