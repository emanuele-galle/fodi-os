'use client'

import { Skeleton } from '@/components/ui/Skeleton'

interface UserProductivity {
  userId: string
  userName: string
  assigned: number
  completed: number
  overdue: number
  hoursLogged: number
}

interface TeamProductivityTableProps {
  data: UserProductivity[]
  loading?: boolean
}

export function TeamProductivityTable({ data, loading }: TeamProductivityTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted">
        Nessun dato disponibile
      </div>
    )
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="md:hidden space-y-3">
        {data.map((user) => {
          const completionPct = user.assigned > 0 ? Math.round((user.completed / user.assigned) * 100) : 0
          return (
            <div key={user.userId} className="rounded-lg border border-border/30 p-3 bg-secondary/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {user.userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="font-medium text-sm truncate">{user.userName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Assegnate</span>
                  <span className="tabular-nums">{user.assigned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Completate</span>
                  <span className="tabular-nums">{user.completed} ({completionPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Scadute</span>
                  {user.overdue > 0 ? (
                    <span className="text-destructive font-medium tabular-nums">{user.overdue}</span>
                  ) : (
                    <span className="text-muted tabular-nums">0</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Ore</span>
                  <span className="tabular-nums font-medium">{user.hoursLogged}h</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider">Membro</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider">Assegnate</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider">Completate</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider">Scadute</th>
              <th className="text-right py-2.5 px-3 text-xs font-medium text-muted uppercase tracking-wider">Ore</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => {
              const completionPct = user.assigned > 0 ? Math.round((user.completed / user.assigned) * 100) : 0
              return (
                <tr key={user.userId} className="border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {user.userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium truncate">{user.userName}</span>
                    </div>
                  </td>
                  <td className="text-right py-2.5 px-3 tabular-nums">{user.assigned}</td>
                  <td className="text-right py-2.5 px-3">
                    <span className="tabular-nums">{user.completed}</span>
                    <span className="text-xs text-muted ml-1">({completionPct}%)</span>
                  </td>
                  <td className="text-right py-2.5 px-3">
                    {user.overdue > 0 ? (
                      <span className="text-destructive font-medium tabular-nums">{user.overdue}</span>
                    ) : (
                      <span className="text-muted tabular-nums">0</span>
                    )}
                  </td>
                  <td className="text-right py-2.5 px-3 tabular-nums font-medium">{user.hoursLogged}h</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
