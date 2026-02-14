'use client'

import { Badge } from '@/components/ui/Badge'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'In attesa',
  OTP_SENT: 'OTP inviato',
  SIGNED: 'Firmato',
  DECLINED: 'Rifiutato',
  EXPIRED: 'Scaduto',
  CANCELLED: 'Annullato',
}

interface SignatureStatusBadgeProps {
  status: string
  className?: string
}

export function SignatureStatusBadge({ status, className }: SignatureStatusBadgeProps) {
  return (
    <Badge status={status} className={className}>
      {STATUS_LABELS[status] || status}
    </Badge>
  )
}
