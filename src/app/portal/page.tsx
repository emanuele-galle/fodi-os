'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderKanban, FileText } from 'lucide-react'
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

interface PortalQuote {
  id: string
  number: string
  title: string
  status: string
  total: string
  createdAt: string
  validUntil: string | null
}


const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  ACTIVE: 'Attivo',
  ON_HOLD: 'In Pausa',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
  SENT: 'In attesa',
  APPROVED: 'Approvato',
  REJECTED: 'Rifiutato',
  EXPIRED: 'Scaduto',
  INVOICED: 'Fatturato',
}

export default function PortalHomePage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<PortalQuote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/projects').then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/portal/quotes').then((r) => (r.ok ? r.json() : { items: [] })),
    ])
      .then(([projData, quoteData]) => {
        setProjects(projData.items || [])
        setQuotes(quoteData.items || [])
      })
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

      {/* Preventivi */}
      {!loading && quotes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Preventivi</h2>
          <div className="space-y-2">
            {quotes.map((q) => (
              <Card
                key={q.id}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => router.push(`/portal/quotes/${q.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{q.title}</p>
                    <p className="text-xs text-muted">{q.number} - {new Date(q.createdAt).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge status={q.status}>
                    {STATUS_LABELS[q.status] || q.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Progetti */}
      <h2 className="text-lg font-semibold mb-3">Progetti</h2>
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
                  <Badge status={project.status}>
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
