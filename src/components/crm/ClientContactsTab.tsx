import { Plus, Mail, Phone, Edit, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Contact } from './types'

interface ClientContactsTabProps {
  contacts: Contact[]
  onAddContact: () => void
  onEditContact: (contact: Contact) => void
  onDeleteContact: (contactId: string) => void
}

export function ClientContactsTab({ contacts, onAddContact, onEditContact, onDeleteContact }: ClientContactsTabProps) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onAddContact}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Contatto
        </Button>
      </div>
      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun contatto registrato"
          description="Aggiungi i contatti principali di questa azienda."
          action={
            <Button size="sm" onClick={onAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Contatto
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-4">
                <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                    {c.isPrimary && <Badge variant="success">Principale</Badge>}
                    {c.role && <span className="text-xs text-muted">- {c.role}</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted mt-1">
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onEditContact(c)} className="p-2 md:p-1.5 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors" title="Modifica">
                    <Edit className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  </button>
                  <button onClick={() => onDeleteContact(c.id)} className="p-2 md:p-1.5 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors" title="Elimina">
                    <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
