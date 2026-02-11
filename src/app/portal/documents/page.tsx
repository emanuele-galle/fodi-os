'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface Document {
  id: string
  name: string
  type: string
  fileUrl: string
  fileSize: number
  createdAt: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/documents')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setDocuments(data.items || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/portal')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Documenti</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun documento"
          description="Non ci sono ancora documenti disponibili."
        />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline">{doc.type}</Badge>
                    <span className="text-xs text-muted">{formatFileSize(doc.fileSize)}</span>
                    <span className="text-xs text-muted">
                      {new Date(doc.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
              </div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Scarica
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
