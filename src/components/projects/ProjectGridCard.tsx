'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Euro } from 'lucide-react'
import { type Project, STATUS_LABELS, PRIORITY_LABELS, STATUS_COLORS } from './types'

function BudgetBar({ project }: { project: Project }) {
  if (!project.budgetAmount) return null
  const budget = parseFloat(project.budgetAmount)
  if (!budget || budget <= 0) return null
  const totalTasks = project._count?.tasks ?? 0
  const doneTasks = project.completedTasks ?? 0
  const spentRatio = totalTasks > 0 ? doneTasks / totalTasks : 0
  const spent = budget * spentRatio
  const percent = Math.min(Math.round(spentRatio * 100), 100)

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-muted mb-0.5">
        <span className="flex items-center gap-1">
          <Euro className="h-3 w-3" />
          Budget
        </span>
        <span>{spent.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} / {budget.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percent >= 90 ? 'bg-destructive' : percent >= 70 ? 'bg-amber-500' : 'bg-accent'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

interface ProjectGridCardProps {
  project: Project
  onClick: () => void
  actionMenu: React.ReactNode
}

export function ProjectGridCard({ project: p, onClick, actionMenu }: ProjectGridCardProps) {
  const totalTasks = p._count?.tasks ?? 0
  const doneTasks = p.completedTasks ?? 0
  return (
    <Card
      className="cursor-pointer overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] transition-all duration-200 touch-manipulation active:scale-[0.98] relative group"
      onClick={onClick}
      style={{ borderTop: `3px solid ${p.color || STATUS_COLORS[p.status] || 'var(--color-primary)'}` }}
    >
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold truncate text-sm md:text-base flex-1">{p.name}</span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {actionMenu}
          </div>
        </div>
        {p.client && (
          <p className="text-xs text-muted mb-3">{p.client.companyName}</p>
        )}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge
            leftLabel="Stato"
            rightLabel={STATUS_LABELS[p.status] || p.status}
            status={p.status}
          />
          <Badge status={p.priority}>
            {PRIORITY_LABELS[p.priority] || p.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {totalTasks > 0 ? `${doneTasks}/${totalTasks} task` : 'Nessun task'}
          </span>
          {p.endDate && (
            <span>Scadenza: {new Date(p.endDate).toLocaleDateString('it-IT')}</span>
          )}
        </div>
        {totalTasks > 0 && (
          <div className="mt-2.5 relative">
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-primary"
                style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted mt-1 block text-right">
              {Math.round((doneTasks / totalTasks) * 100)}%
            </span>
          </div>
        )}
        <BudgetBar project={p} />
      </CardContent>
    </Card>
  )
}
