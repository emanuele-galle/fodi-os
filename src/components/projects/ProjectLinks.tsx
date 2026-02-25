'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, Plus, Pencil, Trash2, ExternalLink, Search, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface LinkCreator {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface ProjectLinkItem {
  id: string
  title: string
  url: string
  description: string | null
  tags: string[]
  creatorId: string
  creator: LinkCreator
  createdAt: string
  updatedAt: string
}

interface ProjectLinksProps {
  projectId: string
}

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function getFaviconUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`
  } catch {
    return null
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(links: ProjectLinkItem[]): { date: string; links: ProjectLinkItem[] }[] {
  const groups: Record<string, ProjectLinkItem[]> = {}
  for (const link of links) {
    const dateKey = new Date(link.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(link)
  }
  return Object.entries(groups).map(([date, links]) => ({ date, links }))
}

export function ProjectLinks({ projectId }: ProjectLinksProps) {
  const [links, setLinks] = useState<ProjectLinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<ProjectLinkItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTags, setFormTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { confirm, confirmProps } = useConfirm()

  const fetchLinks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim().length >= 2) params.set('search', searchQuery.trim())
      if (filterTag) params.set('tag', filterTag)
      const res = await fetch(`/api/projects/${projectId}/links?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLinks(data.items || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [projectId, searchQuery, filterTag])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  // All unique tags for filtering
  const allTags = [...new Set(links.flatMap((l) => l.tags))].sort()

  function openCreateModal() {
    setEditingLink(null)
    setFormTitle('')
    setFormUrl('')
    setFormDescription('')
    setFormTags([])
    setTagInput('')
    setFormError('')
    setModalOpen(true)
  }

  function openEditModal(link: ProjectLinkItem) {
    setEditingLink(link)
    setFormTitle(link.title)
    setFormUrl(link.url)
    setFormDescription(link.description || '')
    setFormTags([...link.tags])
    setTagInput('')
    setFormError('')
    setModalOpen(true)
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !formTags.includes(t)) {
      setFormTags([...formTags, t])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setFormTags(formTags.filter((t) => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formUrl.trim()) {
      setFormError('Titolo e URL sono obbligatori')
      return
    }
    setSubmitting(true)
    setFormError('')

    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        url: formUrl.trim(),
        description: formDescription.trim() || null,
        tags: formTags,
      }

      if (editingLink) {
        body.id = editingLink.id
        const res = await fetch(`/api/projects/${projectId}/links`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          setFormError(err?.error || 'Errore durante il salvataggio')
          return
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          setFormError(err?.error || 'Errore durante la creazione')
          return
        }
      }

      setModalOpen(false)
      fetchLinks()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(linkId: string) {
    const ok = await confirm({
      message: 'Eliminare questo collegamento?',
      variant: 'danger',
    })
    if (!ok) return

    const res = await fetch(`/api/projects/${projectId}/links`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: linkId }),
    })
    if (res.ok) {
      fetchLinks()
    }
  }

  const grouped = groupByDate(links)

  if (loading) {
    return (
      <div className="space-y-3 py-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-secondary/40 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Cerca collegamenti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {allTags.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 flex-wrap">
              {filterTag && (
                <button
                  onClick={() => setFilterTag(null)}
                  className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted transition-colors"
                >
                  Tutti
                </button>
              )}
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${
                    filterTag === tag
                      ? 'bg-primary text-primary-foreground'
                      : `${getTagColor(tag)} hover:opacity-80`
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={openCreateModal} className="ml-3 flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi link
        </Button>
      </div>

      {/* Content */}
      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Nessun collegamento"
          description={searchQuery || filterTag ? 'Prova a modificare i filtri.' : 'Aggiungi link a risorse esterne, documenti, video e altro.'}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              <h3 className="text-sm font-semibold text-muted mb-3">{group.date}</h3>
              <div className="space-y-2">
                {group.links.map((link) => {
                  const favicon = getFaviconUrl(link.url)
                  return (
                    <div
                      key={link.id}
                      className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-[var(--shadow-sm)] transition-all"
                    >
                      {/* Favicon */}
                      <div className="h-10 w-10 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {favicon ? (
                          <img
                            src={favicon}
                            alt=""
                            className="h-6 w-6"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="h-5 w-5 text-muted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' }}
                          />
                        ) : (
                          <Link2 className="h-5 w-5 text-muted" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold hover:text-primary transition-colors truncate"
                          >
                            {link.title}
                          </a>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-primary transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>

                        {/* Tags */}
                        {link.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {link.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getTagColor(tag)}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        {link.description && (
                          <p className="text-xs text-muted line-clamp-2 mb-2">{link.description}</p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              name={`${link.creator.firstName} ${link.creator.lastName}`}
                              src={link.creator.avatarUrl}
                              size="xs"
                            />
                            <span>{link.creator.firstName} {link.creator.lastName}</span>
                          </div>
                          <span>
                            {new Date(link.updatedAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => openEditModal(link)}
                          className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLink ? 'Modifica collegamento' : 'Aggiungi un nuovo collegamento'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Titolo"
            placeholder="es. Ultimo progetto su ProofHQ"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Collegamento</label>
            <textarea
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              rows={2}
              placeholder="Inserisci qui l'URL o il link breve"
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione (Facoltativo)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              placeholder="Aggiungi una descrizione..."
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Tag</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag() }
                    if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addTag() }
                  }}
                  placeholder="Aggiungi tag e premi Invio..."
                  className="pl-9"
                />
              </div>
            </div>
            {formTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {formTags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${getTagColor(tag)}`}
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={submitting}>
              {editingLink ? 'Salva Modifiche' : 'Aggiungi Collegamento'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
