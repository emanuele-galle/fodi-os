'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Plus, Search, AlertCircle, Edit, Trash2, Send, Image } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface SocialPost {
  id: string
  platform: string
  content: string
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  mediaUrls: string[]
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

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
}

const PLATFORM_ICON: Record<string, { label: string; color: string }> = {
  instagram: { label: 'IG', color: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' },
  facebook: { label: 'FB', color: 'bg-blue-600 text-white' },
  linkedin: { label: 'LI', color: 'bg-blue-700 text-white' },
  tiktok: { label: 'TT', color: 'bg-black text-white' },
  twitter: { label: 'X', color: 'bg-neutral-900 text-white' },
}

function CharCounter({ content, platform }: { content: string; platform: string }) {
  const limit = PLATFORM_CHAR_LIMITS[platform] || 2200
  const current = content.length
  const isOver = current > limit
  return (
    <p className={`text-xs text-right mt-1 ${isOver ? 'text-destructive font-semibold' : 'text-muted'}`}>
      {current}/{limit}
    </p>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState('DRAFT')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Create form state
  const [createPlatform, setCreatePlatform] = useState('instagram')
  const [createContent, setCreateContent] = useState('')
  const [createMediaUrls, setCreateMediaUrls] = useState('')

  // Edit modal state
  const [editPost, setEditPost] = useState<SocialPost | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editMediaUrls, setEditMediaUrls] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const { confirm: confirmSocial, confirmProps: confirmSocialProps } = useConfirm()

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

  function openEditModal(post: SocialPost) {
    setEditPost(post)
    setEditContent(post.content)
    setEditScheduledAt(post.scheduledAt ? post.scheduledAt.slice(0, 16) : '')
    setEditMediaUrls((post.mediaUrls || []).join('\n'))
    setEditError(null)
    setEditModalOpen(true)
  }

  async function handleEditSave() {
    if (!editPost) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const mediaUrlsArray = editMediaUrls.split('\n').map(u => u.trim()).filter(Boolean)
      const body: Record<string, unknown> = {
        content: editContent,
        mediaUrls: mediaUrlsArray,
      }
      if (editScheduledAt) body.scheduledAt = new Date(editScheduledAt).toISOString()
      const res = await fetch(`/api/social/${editPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditModalOpen(false)
        setEditPost(null)
        fetchPosts()
      } else {
        setEditError('Errore nel salvataggio delle modifiche')
      }
    } catch {
      setEditError('Errore di rete')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!editPost) return
    const ok = await confirmSocial({ message: 'Sei sicuro di voler eliminare questo post? L\'azione non e\' reversibile.', variant: 'danger' })
    if (!ok) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/social/${editPost.id}`, { method: 'DELETE' })
      if (res.ok) {
        setEditModalOpen(false)
        setEditPost(null)
        fetchPosts()
      } else {
        setEditError('Errore nell\'eliminazione del post')
      }
    } catch {
      setEditError('Errore di rete')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleStatusChange(post: SocialPost, newStatus: string) {
    try {
      const body: Record<string, string> = { status: newStatus }
      if (newStatus === 'scheduled') {
        body.scheduledAt = new Date().toISOString()
      }
      const res = await fetch(`/api/social/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        fetchPosts()
      }
    } catch {
      // Silently fail - user can retry
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    // Add mediaUrls from the textarea
    const mediaUrlsArray = createMediaUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (mediaUrlsArray.length > 0) {
      body.mediaUrls = mediaUrlsArray
    }
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFormError(null)
        setModalOpen(false)
        setCreateContent('')
        setCreateMediaUrls('')
        setCreatePlatform('instagram')
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

  const normalizeStatus = (status: string) => status.toUpperCase()

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="h-6 w-6 text-primary" />
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
      <div className="flex border-b border-border mb-6 overflow-x-auto scrollbar-none" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeStatus === tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`px-4 py-2 min-h-[44px] text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap touch-manipulation ${
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
          {posts.map((post) => {
            const statusUpper = normalizeStatus(post.status)
            const icon = PLATFORM_ICON[post.platform]
            return (
              <Card
                key={post.id}
                className="p-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                onClick={() => openEditModal(post)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {icon && (
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${icon.color}`}>
                        {icon.label}
                      </span>
                    )}
                    <Badge variant={PLATFORM_BADGE[post.platform] || 'default'}>
                      {post.platform}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {(post.mediaUrls || []).length > 0 && (
                      <Badge variant="outline">
                        <Image className="h-3 w-3 mr-1" />
                        {post.mediaUrls.length} media
                      </Badge>
                    )}
                    <Badge status={statusUpper}>
                      {statusUpper === 'DRAFT' ? 'Bozza' : statusUpper === 'SCHEDULED' ? 'Programmato' : 'Pubblicato'}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm line-clamp-3 mb-3">{post.content}</p>

                <div className="text-xs text-muted space-y-1">
                  {post.scheduledAt && (
                    <p className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Programmato: {formatDate(post.scheduledAt)}
                    </p>
                  )}
                  {post.publishedAt && (
                    <p>
                      Pubblicato: {formatDate(post.publishedAt)}
                    </p>
                  )}
                  <p>Creato: {formatDate(post.createdAt)}</p>
                </div>

                {/* Status action buttons */}
                <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  {statusUpper === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(post, 'scheduled')}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Programma
                    </Button>
                  )}
                  {statusUpper === 'SCHEDULED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(post, 'published')}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Pubblica
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Post" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            name="platform"
            label="Piattaforma *"
            options={PLATFORM_OPTIONS}
            value={createPlatform}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreatePlatform(e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contenuto *</label>
            <textarea
              name="content"
              rows={5}
              required
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Scrivi il contenuto del post..."
            />
            <CharCounter content={createContent} platform={createPlatform} />
          </div>
          <Input
            name="scheduledAt"
            label="Data Programmazione"
            type="datetime-local"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Media URLs</label>
            <textarea
              rows={3}
              value={createMediaUrls}
              onChange={(e) => setCreateMediaUrls(e.target.value)}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="URL media (uno per riga)"
            />
          </div>
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

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditPost(null) }} title="Modifica Post" size="lg">
        {editPost && (
          <div className="space-y-4">
            <Select
              label="Piattaforma"
              options={PLATFORM_OPTIONS}
              value={editPost.platform}
              disabled
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Contenuto</label>
              <textarea
                rows={5}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                placeholder="Scrivi il contenuto del post..."
              />
              <CharCounter content={editContent} platform={editPost.platform} />
            </div>
            <Input
              label="Data Programmazione"
              type="datetime-local"
              value={editScheduledAt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditScheduledAt(e.target.value)}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Media URLs</label>
              <textarea
                rows={3}
                value={editMediaUrls}
                onChange={(e) => setEditMediaUrls(e.target.value)}
                className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                placeholder="URL media (uno per riga)"
              />
            </div>
            {editError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{editError}</div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div>
                {normalizeStatus(editPost.status) === 'DRAFT' && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    loading={editSubmitting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setEditModalOpen(false); setEditPost(null) }}>
                  Annulla
                </Button>
                <Button onClick={handleEditSave} loading={editSubmitting}>
                  <Edit className="h-4 w-4 mr-2" />
                  Salva
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog {...confirmSocialProps} />
    </div>
  )
}
