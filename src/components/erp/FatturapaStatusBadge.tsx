import { Badge } from '@/components/ui/Badge'
import { EINVOICE_STATUS_CONFIG } from '@/lib/fatturapa'

interface FatturapaStatusBadgeProps {
  status: string
  className?: string
}

export function FatturapaStatusBadge({ status, className }: FatturapaStatusBadgeProps) {
  const key = status.toUpperCase()
  const config = EINVOICE_STATUS_CONFIG[key]

  if (!config) {
    return <Badge variant="outline" className={className}>{status}</Badge>
  }

  return (
    <Badge
      variant={config.variant as 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'}
      className={className}
    >
      {config.label}
    </Badge>
  )
}
