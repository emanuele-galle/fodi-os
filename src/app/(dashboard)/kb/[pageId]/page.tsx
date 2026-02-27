'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Library, Save, ArrowLeft, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'

interface WikiPageData {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category: string
  tags: string[]
  isPublished: boolean
  sortOrder: number
  parentId: string | null
  createdAt: string
  updatedAt: string
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  children?: { id: string; title: string; slug: string }[]
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'technical', label: 'Tecnico' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'faq', label: 'FAQ' },
]

export default function KbDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pageId = params.pageId as string
  const [data, setData] = useState<WikiPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')

  // Editable fields
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('general')
  const [tagsInput, setTagsInput] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { if (d.user) setUserRole(d.user.role) })
      .catch(() => {})
  }, [])

  const fetchPage = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/kb/${pageId}`)
      if (res.ok) {
        const d: WikiPageData = await res.json()
        setData(d)
        setTitle(d.title)
        setContent(d.content)
        setExcerpt(d.excerpt || '')
        setCategory(d.category)
        setTagsInput(d.tags.join(', '))
        setIsPublished(d.isPublished)
      } else if (res.status === 404) {
        setError('Articolo non trovato')
      }
    } catch {
      setError('Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => { fetchPage() }, [fetchPage])

  const canWrite = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT'].includes(userRole)
  const canDelete = ['ADMIN'].includes(userRole)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch(`/api/kb/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, excerpt: excerpt || undefined, category, tags, isPublished }),
      })
      if (res.ok) {
        const updated = await res.json()
        setData(updated)
      } else {
        const d = await res.json()
        setError(d.error || 'Errore nel salvataggio')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return
    try {
      const res = await fetch(`/api/kb/${pageId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/kb')
      }
    } catch {
      setError('Errore nella cancellazione')
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/kb')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/kb')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{data?.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted">
              {data?.author && (
                <div className="flex items-center gap-1">
                  <Avatar
                    name={`${data.author.firstName} ${data.author.lastName}`}
                    src={data.author.avatarUrl || undefined}
                    size="xs"
                  />
                  <span>{data.author.firstName} {data.author.lastName}</span>
                </div>
              )}
              <span>-</span>
              <span>{data?.updatedAt ? new Date(data.updatedAt).toLocaleDateString('it-IT') : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10" aria-label="Elimina pagina">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" />
              Salva
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {/* Edit form */}
      <div className="space-y-4">
        <Input
          label="Titolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canWrite}
        />

        <Textarea
          label="Contenuto"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          disabled={!canWrite}
        />

        <Input
          label="Estratto"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          disabled={!canWrite}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoria"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!canWrite}
          />
          <Input
            label="Tag (separati da virgola)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={!canWrite}
          />
        </div>

        {canWrite && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded border-border"
            />
            <span className="flex items-center gap-1.5 text-sm">
              {isPublished ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted" />}
              {isPublished ? 'Pubblicato' : 'Bozza'}
            </span>
          </label>
        )}

        {/* Child pages */}
        {data?.children && data.children.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Sotto-pagine</h3>
            <div className="space-y-1">
              {data.children.map(child => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/kb/${child.id}`)}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
                >
                  {child.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
