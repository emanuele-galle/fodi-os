import { Hash, Mail, Globe, Building2, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { InfoRow } from './InfoRow'
import { ClientHealthCard } from './ClientHealthCard'
import { ClientAiInsights } from './ClientAiInsights'
import { ClientBriefing } from './ClientBriefing'
import { AiSuggestionsPanel } from './AiSuggestionsPanel'
import { GenerateEmailButton } from './GenerateEmailButton'
import type { ClientDetail } from './types'

interface ClientOverviewTabProps {
  client: ClientDetail
}

export function ClientOverviewTab({ client }: ClientOverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Salute + Analisi AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClientHealthCard clientId={client.id} />
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold mb-3">Analisi AI</h3>
            <ClientAiInsights clientId={client.id} />
          </CardContent>
        </Card>
      </div>

      {/* Suggerimenti AI + Preparazione Incontro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AiSuggestionsPanel clientId={client.id} limit={3} />
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Preparazione Incontro</h3>
              <GenerateEmailButton clientId={client.id} />
            </div>
            <ClientBriefing clientId={client.id} />
          </CardContent>
        </Card>
      </div>

      {/* Company Details */}
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
              <p className="text-sm text-foreground/65 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted">
            <span>Fatturato totale: <strong className="text-foreground">{formatCurrency(client.totalRevenue)}</strong></span>
            <span>Creato il {new Date(client.createdAt).toLocaleDateString('it-IT')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
