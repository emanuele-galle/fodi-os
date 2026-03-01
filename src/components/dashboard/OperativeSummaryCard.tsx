'use client'

import { Flame } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'

interface OperativeSummaryCardProps {
  overdue: number
  today: number
  inProgress: number
  completedMonth: number
}

export function OperativeSummaryCard({ overdue, today, inProgress, completedMonth }: OperativeSummaryCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
          <CardTitle>Riepilogo Operativo</CardTitle>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div className="text-center p-3 rounded-lg bg-red-500/5 border border-red-200/30 dark:border-red-800/30">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdue}</p>
            <p className="text-xs text-muted mt-1">Scadute</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-amber-500/5 border border-amber-200/30 dark:border-amber-800/30">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{today}</p>
            <p className="text-xs text-muted mt-1">Oggi</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-500/5 border border-blue-200/30 dark:border-blue-800/30">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgress}</p>
            <p className="text-xs text-muted mt-1">In Corso</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-200/30 dark:border-emerald-800/30">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedMonth}</p>
            <p className="text-xs text-muted mt-1">Completate (mese)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
