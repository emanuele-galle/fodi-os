import { Hash, Mail, Globe, Building2, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { InfoRow } from './InfoRow'
import type { ClientDetail } from './types'

interface ClientOverviewTabProps {
  client: ClientDetail
}

export function ClientOverviewTab({ client }: ClientOverviewTabProps) {
  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={Hash} label="P.IVA" value={client.vatNumber} />
          <InfoRow icon={Mail} label="PEC" value={client.pec} />
          <InfoRow icon={Hash} label="Codice SDI" value={client.sdi} />
          <InfoRow icon={Globe} label="Sito Web" value={client.website} />
          <InfoRow icon={Building2} label="Settore" value={client.industry} />
          <InfoRow icon={Users} label="Fonte" value={client.source} />
        </div>
        {client.tags.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-1">Note</p>
            <p className="text-sm text-muted whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted">
          <span>Revenue totale: <strong className="text-foreground">{formatCurrency(client.totalRevenue)}</strong></span>
          <span>Creato il {new Date(client.createdAt).toLocaleDateString('it-IT')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
