'use client'

import { EINVOICE_STATUS_CONFIG } from '@/lib/fatturapa'

interface StatusLog {
  id: string
  fromStatus: string
  toStatus: string
  note?: string | null
  performedBy?: string | null
  createdAt: string
}

interface FatturapaTimelineProps {
  logs: StatusLog[]
}

export function FatturapaTimeline({ logs }: FatturapaTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted">Nessuna transizione di stato registrata.</p>
  }

  return (
    <div className="relative ml-3">
      {/* Vertical line */}
      <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border/50" />

      <div className="space-y-4">
        {logs.map((log) => {
          const toConfig = EINVOICE_STATUS_CONFIG[log.toStatus.toUpperCase()]
          const color = toConfig?.color || '#94a3b8'

          return (
            <div key={log.id} className="relative pl-6">
              {/* Dot */}
              <div
                className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full -translate-x-1"
                style={{ backgroundColor: color }}
              />

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color }}>
                    {toConfig?.label || log.toStatus}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(log.createdAt).toLocaleString('it-IT')}
                  </span>
                </div>
                {log.note && (
                  <p className="text-xs text-muted">{log.note}</p>
                )}
                {log.performedBy && (
                  <p className="text-xs text-muted/60">da {log.performedBy}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
