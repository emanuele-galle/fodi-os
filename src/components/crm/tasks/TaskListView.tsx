'use client'

import { CheckCircle, Edit, Trash2, Clock, User, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { PRIORITY_BADGE } from '@/lib/crm-constants'
import Link from 'next/link'
import { STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, type CrmTask } from './types'

interface TaskListViewProps {
  tasks: CrmTask[]
  isOverdue: (task: CrmTask) => boolean
  onComplete: (taskId: string) => void
  onEdit: (task: CrmTask) => void
  onDelete: (taskId: string) => void
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function TaskListView({
  tasks, isOverdue, onComplete, onEdit, onDelete,
  page, totalPages, total, onPageChange,
}: TaskListViewProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-border/40 bg-card p-4 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{task.title}</p>
                {task.taskType && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {TYPE_LABELS[task.taskType] || task.taskType}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge status={task.status}>{STATUS_LABELS[task.status] || task.status}</Badge>
                <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-xs">
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </Badge>
              </div>
            </div>
            {task.description && (
              <p className="text-xs text-muted line-clamp-2">{task.description}</p>
            )}
            {task.client && (
              <Link href={`/crm/${task.clientId}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                <Building2 className="h-3 w-3" />
                {task.client.companyName}
              </Link>
            )}
            {task.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <User className="h-3 w-3" />
                {task.assignee.firstName} {task.assignee.lastName}
              </div>
            )}
            {task.dueDate && (
              <div className={`flex items-center gap-1.5 text-xs ${isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}`}>
                <Clock className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                {isOverdue(task) && ' (Scaduta)'}
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted">{new Date(task.createdAt).toLocaleDateString('it-IT')}</span>
              <div className="flex items-center gap-1.5">
                {task.status !== 'DONE' && (
                  <Button variant="ghost" size="sm" onClick={() => onComplete(task.id)} className="h-8 w-8 p-0 text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onEdit(task)} className="h-8 w-8 p-0">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)} className="h-8 w-8 p-0 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 bg-secondary/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Titolo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden xl:table-cell">Assegnato a</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Priorità</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Stato</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Scadenza</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted/80 uppercase tracking-wider">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors group">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.taskType && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {TYPE_LABELS[task.taskType] || task.taskType}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {task.client ? (
                    <Link
                      href={`/crm/${task.clientId}`}
                      className="text-primary hover:underline flex items-center gap-1.5"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {task.client.companyName}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} src={task.assignee.avatarUrl} size="xs" />
                      <span className="text-sm text-muted">{task.assignee.firstName} {task.assignee.lastName}</span>
                    </div>
                  ) : (
                    <span className="text-muted text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={PRIORITY_BADGE[task.priority] || 'default'}>
                    {PRIORITY_LABELS[task.priority] || task.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge status={task.status}>{STATUS_LABELS[task.status] || task.status}</Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {task.dueDate ? (
                    <span className={isOverdue(task) ? 'text-destructive font-medium' : 'text-muted'}>
                      {new Date(task.dueDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status !== 'DONE' && (
                      <Button variant="ghost" size="sm" onClick={() => onComplete(task.id)} className="h-8 w-8 p-0 text-emerald-600" title="Completa">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onEdit(task)} className="h-8 w-8 p-0" title="Modifica">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)} className="h-8 w-8 p-0 text-destructive" title="Elimina">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted">{total} attività totali</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
