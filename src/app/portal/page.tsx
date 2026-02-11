'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface Project {
  id: string
  name: string
  status: string
  progress: number
  description: string | null
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PLANNING: 'default',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  ACTIVE: 'Attivo',
  ON_HOLD: 'In Pausa',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
}

export default function PortalHomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/projects')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setProjects(data.items || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Benvenuto</h1>
        <p className="text-sm text-muted mt-1">Panoramica dei tuoi progetti</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => router.push('/portal/documents')}
          className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
        >
          Documenti
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto"
          description="Non ci sono ancora progetti associati al tuo account."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{project.name}</CardTitle>
                  <Badge variant={STATUS_BADGE[project.status] || 'default'}>
                    {STATUS_LABELS[project.status] || project.status}
                  </Badge>
                </div>
                {project.description && (
                  <CardDescription>{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Avanzamento</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
