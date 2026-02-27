'use client'

import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { type Project, type SortField, type SortDirection, STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS } from './types'

interface ProjectTableViewProps {
  projects: Project[]
  sortField: SortField
  sortDirection: SortDirection
  onColumnSort: (field: SortField) => void
  onProjectClick: (projectId: string) => void
  renderActionMenu: (project: Project) => React.ReactNode
}

function SortableHeader({
  field,
  label,
  className,
  sortField,
  sortDirection,
  onColumnSort,
}: {
  field: SortField
  label: string
  className?: string
  sortField: SortField
  sortDirection: SortDirection
  onColumnSort: (field: SortField) => void
}) {
  const isActive = sortField === field
  return (
    <th
      className={`py-3 px-4 font-medium text-muted cursor-pointer select-none hover:text-foreground transition-colors ${className || ''}`}
      onClick={() => onColumnSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  )
}

export function ProjectTableView({
  projects,
  sortField,
  sortDirection,
  onColumnSort,
  onProjectClick,
  renderActionMenu,
}: ProjectTableViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/40 bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30 text-left">
            <SortableHeader field="name" label="Nome" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <SortableHeader field="client" label="Cliente" className="hidden sm:table-cell" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <SortableHeader field="status" label="Stato" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <SortableHeader field="priority" label="Priorita" className="hidden md:table-cell" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <th className="py-3 px-4 font-medium text-muted hidden md:table-cell">Progresso</th>
            <SortableHeader field="endDate" label="Scadenza" className="hidden lg:table-cell" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <SortableHeader field="budget" label="Budget" className="hidden lg:table-cell" sortField={sortField} sortDirection={sortDirection} onColumnSort={onColumnSort} />
            <th className="py-3 px-4 text-right font-medium text-muted">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const totalTasks = p._count?.tasks ?? 0
            const doneTasks = p.completedTasks ?? 0
            const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
            return (
              <tr
                key={p.id}
                className="border-b border-border/20 hover:bg-secondary/30 cursor-pointer transition-colors"
                onClick={() => onProjectClick(p.id)}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: p.color || STATUS_COLORS[p.status] || 'var(--color-primary)' }}
                    />
                    <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted hidden sm:table-cell">{p.client?.companyName || '-'}</td>
                <td className="py-3 px-4">
                  <StatusBadge
                    leftLabel="Stato"
                    rightLabel={STATUS_LABELS[p.status] || p.status}
                    status={p.status}
                  />
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <Badge status={p.priority}>
                    {PRIORITY_LABELS[p.priority] || p.priority}
                  </Badge>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden flex-1">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-xs text-muted w-8 text-right">{progressPercent}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted hidden lg:table-cell">
                  {p.endDate ? new Date(p.endDate).toLocaleDateString('it-IT') : '-'}
                </td>
                <td className="py-3 px-4 text-muted hidden lg:table-cell">
                  {p.budgetAmount ? parseFloat(p.budgetAmount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '-'}
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {renderActionMenu(p)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
