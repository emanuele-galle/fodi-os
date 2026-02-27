'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { FolderOpen, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ProjectStatsHeaderProps {
  totalCount: number
  inProgress: number
  completed: number
  overdue: number
}

export function ProjectStatsHeader({ totalCount, inProgress, completed, overdue }: ProjectStatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-stagger">
      <Card>
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full text-primary" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Totale Progetti</p>
            <p className="text-xl sm:text-2xl font-bold animate-count-up">{totalCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full text-accent" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">In Corso</p>
            <p className="text-xl sm:text-2xl font-bold animate-count-up">{inProgress}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full text-[var(--color-accent)]" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Completati</p>
            <p className="text-xl sm:text-2xl font-bold animate-count-up">{completed}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full text-destructive" style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">In Ritardo</p>
            <p className="text-xl sm:text-2xl font-bold animate-count-up">{overdue}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
