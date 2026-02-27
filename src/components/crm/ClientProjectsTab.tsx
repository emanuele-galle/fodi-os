import { useRouter } from 'next/navigation'
import { FolderKanban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ClientProject } from './types'

interface ClientProjectsTabProps {
  projects: ClientProject[]
}

export function ClientProjectsTab({ projects }: ClientProjectsTabProps) {
  const router = useRouter()

  return (
    <div>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto collegato"
          description="I progetti associati a questo cliente appariranno qui."
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200"
              onClick={() => router.push(`/projects/${p.id}`)}
            >
              <CardContent className="flex items-center justify-between">
                <span className="font-medium text-sm">{p.name}</span>
                <div className="flex items-center gap-2">
                  <Badge status={p.status}>{p.status}</Badge>
                  <Badge status={p.priority}>{p.priority}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
