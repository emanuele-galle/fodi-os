'use client'

import { CheckCircle, Send, Eye, XCircle, Ban, Clock, ShieldAlert, FileSignature } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  created: { icon: FileSignature, color: 'text-primary', label: 'Richiesta creata' },
  otp_sent: { icon: Send, color: 'text-blue-500', label: 'OTP inviato' },
  otp_failed: { icon: ShieldAlert, color: 'text-amber-500', label: 'OTP errato' },
  viewed: { icon: Eye, color: 'text-muted', label: 'Documento visualizzato' },
  signed: { icon: CheckCircle, color: 'text-emerald-500', label: 'Documento firmato' },
  declined: { icon: XCircle, color: 'text-red-500', label: 'Firma rifiutata' },
  cancelled: { icon: Ban, color: 'text-amber-500', label: 'Richiesta annullata' },
}

interface SignatureAuditTimelineProps {
  entries: AuditEntry[]
}

export function SignatureAuditTimeline({ entries }: SignatureAuditTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted py-4">Nessuna attività registrata.</p>
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const config = ACTION_CONFIG[entry.action] || { icon: Clock, color: 'text-muted', label: entry.action }
        const Icon = config.icon
        const isLast = i === entries.length - 1

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full bg-card border border-border/50 ${config.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border/40 min-h-[24px]" />}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted">
                {new Date(entry.createdAt).toLocaleString('it-IT', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {entry.ipAddress && entry.ipAddress !== 'unknown' && (
                <p className="text-xs text-muted/70 mt-0.5">IP: {entry.ipAddress}</p>
              )}
              {entry.metadata && typeof entry.metadata === 'object' && (entry.metadata as Record<string, string>).reason && (
                <p className="text-xs text-muted/70 mt-0.5">
                  Motivo: {(entry.metadata as Record<string, string>).reason}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
