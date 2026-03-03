'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { PortalFileUpload } from '@/components/portal/PortalFileUpload'

interface UploadedFile {
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface Project {
  id: string
  name: string
}

const CATEGORIES = [
  { value: 'general', label: 'Generale' },
  { value: 'bug', label: 'Problema / Bug' },
  { value: 'feature', label: 'Nuova funzionalità' },
  { value: 'billing', label: 'Fatturazione' },
  { value: 'other', label: 'Altro' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
]

export default function PortalNewTicketPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [category, setCategory] = useState('general')
  const [projectId, setProjectId] = useState('')
  const [attachments, setAttachments] = useState<UploadedFile[]>([])

  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setAttachments((prev) => [...prev, file])
  }, [])

  const handleFileRemove = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  useEffect(() => {
    fetch('/api/portal/projects')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setProjects(data.items || []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          description,
          priority,
          category,
          ...(projectId && { projectId }),
          ...(attachments.length > 0 && { attachments }),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore nella creazione del ticket')
        return
      }

      router.push(`/portal/tickets/${data.data.id}`)
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push('/portal/tickets')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai ticket
      </button>

      <h1 className="text-2xl font-bold mb-6">Nuovo Ticket</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="subject" className="block text-sm font-medium">
                Oggetto *
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Breve descrizione del problema"
                required
                className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-medium">
                Descrizione *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrivi in dettaglio il problema o la richiesta..."
                required
                rows={5}
                className="flex w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="priority" className="block text-sm font-medium">
                  Priorità
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="category" className="block text-sm font-medium">
                  Categoria
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {projects.length > 0 && (
                <div className="space-y-1">
                  <label htmlFor="projectId" className="block text-sm font-medium">
                    Progetto
                  </label>
                  <select
                    id="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="flex h-10 w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <option value="">Nessun progetto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Allegati</label>
              <PortalFileUpload
                onUpload={handleFileUploaded}
                onRemove={handleFileRemove}
                files={attachments}
                maxFiles={5}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading}>
                <Send className="h-4 w-4 mr-1.5" />
                {loading ? 'Invio in corso...' : 'Invia Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
