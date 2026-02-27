'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface ClientTasksTabProps {
  clientId: string
}

export function ClientTasksTab({ clientId }: ClientTasksTabProps) {
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null; assignee?: { firstName: string; lastName: string } | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tasks?clientId=${clientId}&limit=50`)
      .then(r => r.json())
      .then(data => setTasks(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (tasks.length === 0) return <EmptyState icon={CheckSquare} title="Nessuna attività" description="Le attività collegate a questo cliente appariranno qui." action={<Button size="sm" onClick={() => window.location.href = '/crm/tasks'}><Plus className="h-4 w-4 mr-1" />Crea Attività</Button>} />

  const PRIORITY_COLORS: Record<string, string> = { URGENT: 'text-red-600', HIGH: 'text-orange-500', MEDIUM: 'text-yellow-600', LOW: 'text-muted' }
  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <Card key={t.id} className="!p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${t.status === 'DONE' ? 'bg-emerald-500' : t.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-muted'}`} />
              <span className={`text-sm font-medium truncate ${t.status === 'DONE' ? 'line-through text-muted' : ''}`}>{t.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {t.dueDate && (
                <span className={`text-xs ${new Date(t.dueDate) < new Date() && t.status !== 'DONE' ? 'text-destructive font-medium' : 'text-muted'}`}>
                  {new Date(t.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              )}
              <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority] || 'text-muted'}`}>{t.priority}</span>
              <Badge status={t.status}>{t.status}</Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
