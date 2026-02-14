'use client'

import { Badge } from '@/components/ui/Badge'

const STATUS_CONFIG: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'; label: string }> = {
  PENDING: { variant: 'default', label: 'In attesa' },
  OTP_SENT: { variant: 'info', label: 'OTP inviato' },
  SIGNED: { variant: 'success', label: 'Firmato' },
  DECLINED: { variant: 'destructive', label: 'Rifiutato' },
  EXPIRED: { variant: 'outline', label: 'Scaduto' },
  CANCELLED: { variant: 'warning', label: 'Annullato' },
}

interface SignatureStatusBadgeProps {
  status: string
  className?: string
}

export function SignatureStatusBadge({ status, className }: SignatureStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { variant: 'outline' as const, label: status }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
