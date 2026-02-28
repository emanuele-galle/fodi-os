import { History } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { ActivityLogEntry } from './task-detail-types'

interface TaskActivityLogProps {
  activityLog: ActivityLogEntry[]
}

export function TaskActivityLog({ activityLog }: TaskActivityLogProps) {
  if (activityLog.length === 0) return null

  const statusMap: Record<string, string> = { TODO: 'Da fare', IN_PROGRESS: 'In Corso', IN_REVIEW: 'In Revisione', DONE: 'Completato', CANCELLED: 'Cancellato' }
  const priorityMap: Record<string, string> = { LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }
  const fieldLabels: Record<string, string> = {
    title: 'titolo', description: 'descrizione', status: 'stato', priority: 'priorità',
    dueDate: 'scadenza', assigneeId: 'assegnatario', projectId: 'progetto',
    folderId: 'cartella', milestoneId: 'milestone', tags: 'tag',
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  const formatValue = (field: string, val: unknown): string => {
    if (val === null || val === undefined) return 'nessuno'
    if (field === 'status') return statusMap[val as string] || (val as string)
    if (field === 'priority') return priorityMap[val as string] || (val as string)
    if (field === 'dueDate') {
      const d = new Date(val as string)
      return isNaN(d.getTime()) ? (val as string) : d.toLocaleDateString('it-IT')
    }
    if (field === 'description') return val === '...' ? '...' : (val ? '...' : 'vuota')
    if (field === 'tags' && Array.isArray(val)) return val.length ? val.join(', ') : 'nessuno'
    return val as string
  }

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
        <History className="h-4 w-4" />
        Cronologia Attività
      </h4>
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {activityLog
          .filter((entry) => entry.action === 'UPDATE' && entry.metadata?.changes && (entry.metadata.changes as Array<{ field: string; from: unknown; to: unknown }>).length > 0)
          .map((entry) => {
            const entryChanges = (entry.metadata?.changes || []) as Array<{ field: string; from: unknown; to: unknown }>
            return (
              <div key={entry.id} className="flex gap-3">
                <Avatar
                  name={`${entry.user.firstName} ${entry.user.lastName}`}
                  src={entry.user.avatarUrl}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {entry.user.firstName} {entry.user.lastName}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(entry.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {entryChanges.map((change, i) => (
                      <p key={i} className="text-xs text-foreground/70">
                        {change.field === 'description' ? (
                          'Ha modificato la descrizione'
                        ) : (
                          <>
                            Ha cambiato {fieldLabels[change.field] || change.field}:{' '}
                            <span className="line-through text-muted">{formatValue(change.field, change.from)}</span>
                            {' → '}
                            <span className="font-medium text-foreground">{formatValue(change.field, change.to)}</span>
                          </>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        {activityLog.filter((e) => e.action === 'CREATE').map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <Avatar
              name={`${entry.user.firstName} ${entry.user.lastName}`}
              src={entry.user.avatarUrl}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {entry.user.firstName} {entry.user.lastName}
                </span>
                <span className="text-xs text-muted">
                  {new Date(entry.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-foreground/70 mt-0.5">Ha creato la task</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
