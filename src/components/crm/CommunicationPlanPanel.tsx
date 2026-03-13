'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Sparkles, Loader2, Mail, Phone, Users, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommunicationStep {
  sequence: number
  dayFromNow: number
  channel: 'EMAIL' | 'CALL' | 'MEETING' | 'WHATSAPP'
  scenario: string
  subject: string
  objective: string
  notes: string
}

interface CommunicationPlanPanelProps {
  clientId: string
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Users,
  WHATSAPP: MessageCircle,
}

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  CALL: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  MEETING: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  WHATSAPP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
}

export function CommunicationPlanPanel({ clientId }: CommunicationPlanPanelProps) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<{ summary: string; recommendations: CommunicationStep[] } | null>(null)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/communication-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setPlan(data.data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [clientId])

  if (!plan) {
    return (
      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
        Piano Comunicazioni AI
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Piano Comunicazioni AI</h4>
        <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {plan.summary && (
        <p className="text-xs text-muted">{plan.summary}</p>
      )}

      <div className="space-y-2">
        {plan.recommendations.map(step => {
          const Icon = CHANNEL_ICONS[step.channel] || Mail
          return (
            <div key={step.sequence} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', CHANNEL_COLORS[step.channel] || CHANNEL_COLORS.EMAIL)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {step.sequence < plan.recommendations.length && (
                  <div className="w-px h-full min-h-[20px] bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">{step.subject}</span>
                  <span className="text-[10px] text-muted">
                    {step.dayFromNow === 0 ? 'Oggi' : `+${step.dayFromNow}g`}
                  </span>
                </div>
                <p className="text-xs text-muted">{step.objective}</p>
                {step.notes && <p className="text-[11px] text-muted/70 mt-0.5">{step.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
