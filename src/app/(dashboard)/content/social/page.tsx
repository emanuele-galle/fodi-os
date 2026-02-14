'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Plus, Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface SocialPost {
  id: string
  platform: string
  content: string
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
}

const STATUS_TABS = [
  { value: 'DRAFT', label: 'Bozze' },
  { value: 'SCHEDULED', label: 'Programmati' },
  { value: 'PUBLISHED', label: 'Pubblicati' },
]

const PLATFORM_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  instagram: 'default',
  facebook: 'success',
  linkedin: 'outline',
  tiktok: 'warning',
  twitter: 'default',
}

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter/X' },
]

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'outline'> = {
  DRAFT: 'default',
  SCHEDULED: 'warning',
  PUBLISHED: 'success',
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState('DRAFT')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (activeStatus) params.set('status', activeStatus)
      const res = await fetch(`/api/social?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.items || [])
      } else {
        setFetchError('Errore nel caricamento dei post')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei post')
    } finally {
      setLoading(false)
    }
  }, [activeStatus])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFormError(null)
        setModalOpen(false)
        fetchPosts()
      } else {
        setFormError('Errore nella creazione del post')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Calendario Social</h1>
            <p className="text-sm text-muted">Pianifica e pubblica i tuoi contenuti social</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Post
        </Button>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchPosts()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex border-b border-border mb-6" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeStatus === tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeStatus === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`Nessun post ${activeStatus === 'DRAFT' ? 'in bozza' : activeStatus === 'SCHEDULED' ? 'programmato' : 'pubblicato'}`}
          description="Crea un nuovo post per iniziare a pianificare i tuoi contenuti social."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Post
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={PLATFORM_BADGE[post.platform] || 'default'}>
                  {post.platform}
                </Badge>
                <Badge variant={STATUS_BADGE[post.status] || 'default'}>
                  {post.status === 'DRAFT' ? 'Bozza' : post.status === 'SCHEDULED' ? 'Programmato' : 'Pubblicato'}
                </Badge>
              </div>

              <p className="text-sm line-clamp-3 mb-3">{post.content}</p>

              <div className="text-xs text-muted space-y-1">
                {post.scheduledAt && (
                  <p className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Programmato: {new Date(post.scheduledAt).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {post.publishedAt && (
                  <p>
                    Pubblicato: {new Date(post.publishedAt).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Post" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select name="platform" label="Piattaforma *" options={PLATFORM_OPTIONS} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contenuto *</label>
            <textarea
              name="content"
              rows={5}
              required
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Scrivi il contenuto del post..."
            />
          </div>
          <Input
            name="scheduledAt"
            label="Data Programmazione"
            type="datetime-local"
          />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>Crea Post</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
