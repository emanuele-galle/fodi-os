import { Plus, Edit, Trash2, MessageSquare, FileText, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { INTERACTION_ICONS } from '@/lib/crm-constants'
import type { Interaction } from './types'

interface ClientInteractionsTabProps {
  interactions: Interaction[]
  onAddInteraction: () => void
  onEditInteraction: (interaction: Interaction) => void
  onDeleteInteraction: (interactionId: string) => void
}

export function ClientInteractionsTab({ interactions, onAddInteraction, onEditInteraction, onDeleteInteraction }: ClientInteractionsTabProps) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onAddInteraction}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Interazione
        </Button>
      </div>
      {interactions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nessuna interazione registrata"
          description="Registra chiamate, email e incontri con questo cliente."
          action={
            <Button size="sm" onClick={onAddInteraction}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Interazione
            </Button>
          }
        />
      ) : (
        <div className="relative border-l-2 border-border ml-4 space-y-4">
          {interactions.map((i) => {
            const Icon = INTERACTION_ICONS[i.type] || FileText
            return (
              <div key={i.id} className="relative pl-6 group/interaction">
                <div className="absolute -left-2.5 top-1 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{i.subject}</span>
                      {i.contact && (
                        <span className="text-xs text-muted flex items-center gap-1 flex-shrink-0">
                          <Users className="h-3 w-3" />
                          {i.contact.firstName} {i.contact.lastName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted">
                        {new Date(i.date).toLocaleDateString('it-IT')}
                      </span>
                      <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/interaction:opacity-100 transition-opacity ml-1">
                        <button onClick={() => onEditInteraction(i)} className="p-1.5 md:p-1 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors" title="Modifica">
                          <Edit className="h-3.5 w-3.5 md:h-3 md:w-3" />
                        </button>
                        <button onClick={() => onDeleteInteraction(i.id)} className="p-1.5 md:p-1 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors" title="Elimina">
                          <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {i.content && (
                    <p className="text-sm text-muted line-clamp-2">{i.content}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
