import { useRouter } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import type { ClientQuote } from './types'

interface ClientQuotesTabProps {
  quotes: ClientQuote[]
  clientId: string
}

export function ClientQuotesTab({ quotes, clientId }: ClientQuotesTabProps) {
  const router = useRouter()

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => router.push(`/erp/quotes/new?clientId=${clientId}`)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Preventivo
        </Button>
      </div>
      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun preventivo collegato"
          description="I preventivi di questo cliente appariranno qui."
          action={
            <Button size="sm" onClick={() => router.push(`/erp/quotes/new?clientId=${clientId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Preventivo
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200"
              onClick={() => router.push(`/erp/quotes/${q.id}`)}
            >
              <CardContent className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{q.number}</span>
                  <span className="text-muted text-sm ml-2">{q.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={q.status}>{q.status}</Badge>
                  <span className="font-medium text-sm">{formatCurrency(q.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
