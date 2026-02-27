'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface ClientSignaturesTabProps {
  clientId: string
}

export function ClientSignaturesTab({ clientId }: ClientSignaturesTabProps) {
  const router = useRouter()
  const [signatures, setSignatures] = useState<Array<{ id: string; documentTitle: string; status: string; signerName: string; createdAt: string; signedAt: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/signatures?clientId=${clientId}&limit=50`)
      .then(r => r.json())
      .then(d => setSignatures(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600',
    OTP_SENT: 'bg-blue-500/10 text-blue-600',
    SIGNED: 'bg-emerald-500/10 text-emerald-600',
    DECLINED: 'bg-red-500/10 text-red-600',
    EXPIRED: 'bg-slate-500/10 text-slate-500',
    CANCELLED: 'bg-slate-500/10 text-slate-500',
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (signatures.length === 0) return <EmptyState icon={FileText} title="Nessuna richiesta di firma" description="Le richieste di firma per questo cliente appariranno qui." />

  return (
    <div className="space-y-2">
      {signatures.map(s => (
        <Card key={s.id} className="cursor-pointer hover:shadow-[var(--shadow-md)] transition-all" onClick={() => router.push(`/erp/signatures/${s.id}`)}>
          <CardContent className="flex items-center justify-between !py-3">
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block">{s.documentTitle}</span>
              <span className="text-xs text-muted">{s.signerName} &middot; {new Date(s.createdAt).toLocaleDateString('it-IT')}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
