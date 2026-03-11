'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- event handlers and dynamic styles */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'motion/react'
import { ArrowLeft, Pencil, Save, X, Trash2, FileText, Eye, EyeOff, ChevronRight, Download } from 'lucide-react'
import { getCategoryMeta } from '@/lib/kb-config'
import { KbMarkdown } from '@/components/kb/KbMarkdown'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'

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
  children?: ChildPage[]
  parent?: { id: string; title: string } | null
}

interface ChildPage {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'technical', label: 'Tecnico' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'faq', label: 'FAQ' },
]

const WRITE_ROLES = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT']

function KbChildrenList({ pages, onNavigate }: { pages: ChildPage[]; onNavigate: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted" />
        Contenuti
      </h2>
      <div className="space-y-2">
        {pages.map((child, i) => {
          const childMeta = getCategoryMeta(child.category)
          const ChildIcon = childMeta.icon
          return (
            <motion.button
              key={child.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              onClick={() => onNavigate(child.id)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/30 hover:border-border/60 hover:bg-secondary/20 transition-all group text-left"
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${childMeta.color}15` }}
              >
                <ChildIcon className="h-4 w-4" style={{ color: childMeta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{child.title}</h3>
                {child.excerpt && (
                  <p className="text-xs text-muted truncate mt-0.5">{child.excerpt}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-foreground transition-colors flex-shrink-0" />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function KbSiblingNav({ siblings, currentId, onNavigate }: { siblings: { id: string; title: string }[]; currentId: string; onNavigate: (id: string) => void }) {
  const idx = siblings.findIndex(s => s.id === currentId)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null
  if (!prev && !next) return null

  return (
    <div className="flex items-stretch gap-3 pt-6 border-t border-border/30">
      {prev ? (
        <button onClick={() => onNavigate(prev.id)} className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors group text-left">
          <ArrowLeft className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Precedente</p>
            <p className="text-sm font-medium truncate">{prev.title}</p>
          </div>
        </button>
      ) : <div className="flex-1" />}
      {next ? (
        <button onClick={() => onNavigate(next.id)} className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors group text-right">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted">Successivo</p>
            <p className="text-sm font-medium truncate">{next.title}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-foreground transition-colors" />
        </button>
      ) : <div className="flex-1" />}
    </div>
  )
}

function KbEditForm({
  content, setContent, excerpt, setExcerpt, category, setCategory,
  tagsInput, setTagsInput, isPublished, setIsPublished,
}: {
  content: string; setContent: (v: string) => void
  excerpt: string; setExcerpt: (v: string) => void
  category: string; setCategory: (v: string) => void
  tagsInput: string; setTagsInput: (v: string) => void
  isPublished: boolean; setIsPublished: (v: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <Textarea label="Contenuto (Markdown)" value={content} onChange={e => setContent(e.target.value)} rows={20} className="font-mono text-sm" />
      <Input label="Estratto" value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Breve descrizione (visibile nella card)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 px-3 text-sm rounded-xl border border-border/40 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20">
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Input label="Tag (separati da virgola)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="docker, deploy, guida" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded border-border" />
        <span className="flex items-center gap-1.5 text-sm">
          {isPublished ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted" />}
          {isPublished ? 'Pubblicato' : 'Bozza'}
        </span>
      </label>
    </div>
  )
}

export default function KbDetailPage() {
  const router = useRouter()
  const params = useParams()
  const pageId = params.pageId as string
  const [data, setData] = useState<WikiPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [editing, setEditing] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('general')
  const [tagsInput, setTagsInput] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [siblings, setSiblings] = useState<{ id: string; title: string }[]>([])

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
      if (!res.ok) {
        setError(res.status === 404 ? 'Articolo non trovato' : 'Errore nel caricamento')
        return
      }
      const d: WikiPageData = await res.json()
      setData(d)
      setTitle(d.title)
      setContent(d.content)
      setExcerpt(d.excerpt || '')
      setCategory(d.category)
      setTagsInput(d.tags.join(', '))
      setIsPublished(d.isPublished)

      if (d.parentId) {
        const sibRes = await fetch(`/api/kb?parentId=${d.parentId}&limit=50`)
        if (sibRes.ok) {
          const sibData = await sibRes.json()
          setSiblings((sibData.items || []).map((s: WikiPageData) => ({ id: s.id, title: s.title })))
        }
      }
    } catch {
      setError('Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => { fetchPage() }, [fetchPage])

  const canWrite = WRITE_ROLES.includes(userRole)
  const canDelete = userRole === 'ADMIN'
  const navigate = useCallback((id: string) => router.push(`/kb/${id}`), [router])

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
        setData(await res.json())
        setEditing(false)
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
      if (res.ok) router.push('/kb')
    } catch {
      setError('Errore nella cancellazione')
    }
  }

  function cancelEdit() {
    if (!data) return
    setEditing(false)
    setTitle(data.title)
    setContent(data.content)
    setExcerpt(data.excerpt || '')
    setCategory(data.category)
    setTagsInput(data.tags.join(', '))
    setIsPublished(data.isPublished)
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-8 w-80 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        <button onClick={() => router.push('/kb')} className="mt-4 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Torna alla Knowledge Base
        </button>
      </div>
    )
  }

  if (!data) return null

  const meta = getCategoryMeta(data.category)
  const Icon = meta.icon
  const hasChildren = !editing && data.children && data.children.length > 0
  const showSiblings = !editing && data.parentId && siblings.length > 0

  return (
    <div className="max-w-4xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted print:hidden">
        <button onClick={() => router.push('/kb')} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> Knowledge Base
        </button>
        {data.parent && (
          <>
            <span>/</span>
            <button onClick={() => router.push(`/kb/${data.parentId}`)} className="hover:text-foreground transition-colors">{data.parent.title}</button>
          </>
        )}
        <span>/</span>
        <span className="text-foreground font-medium truncate">{data.title}</span>
      </div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 print:hidden" style={{ backgroundColor: `${meta.color}15` }}>
            <Icon className="h-6 w-6" style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white flex-shrink-0" style={{ backgroundColor: meta.color }}>{meta.label}</span>
              {!data.isPublished && (
                <span className="flex items-center gap-1 text-[10px] text-muted bg-secondary/60 px-1.5 py-0.5 rounded-full">
                  <EyeOff className="h-3 w-3" /> Bozza
                </span>
              )}
            </div>
            {editing
              ? <Input value={title} onChange={e => setTitle(e.target.value)} className="text-xl font-bold" />
              : <h1 className="text-xl font-bold">{data.title}</h1>
            }
            <div className="flex items-center gap-3 mt-1 text-xs text-muted">
              <span>{data.author.firstName} {data.author.lastName}</span>
              <span className="h-1 w-1 rounded-full bg-muted/40" />
              <span>Aggiornato il {new Date(data.updatedAt).toLocaleDateString('it-IT')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            {canWrite && editing ? (
              <>
                <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted bg-secondary/50 rounded-lg hover:bg-secondary transition-colors">
                  <X className="h-3.5 w-3.5" /> Annulla
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                  <Save className="h-3.5 w-3.5" /> {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted bg-secondary/50 rounded-lg hover:bg-secondary transition-colors" aria-label="Scarica PDF">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                {canDelete && (
                  <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors" aria-label="Elimina">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {canWrite && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Modifica
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {!editing && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.tags.map(tag => (
            <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/60 text-muted font-medium">{tag}</span>
          ))}
        </div>
      )}

      {/* Content */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {editing ? (
          <KbEditForm
            content={content} setContent={setContent}
            excerpt={excerpt} setExcerpt={setExcerpt}
            category={category} setCategory={setCategory}
            tagsInput={tagsInput} setTagsInput={setTagsInput}
            isPublished={isPublished} setIsPublished={setIsPublished}
          />
        ) : (
          <div className="rounded-xl border border-border/30 bg-card p-6 sm:p-8">
            <KbMarkdown content={data.content} />
          </div>
        )}
      </motion.div>

      {hasChildren && <KbChildrenList pages={data.children!} onNavigate={navigate} />}
      {showSiblings && <KbSiblingNav siblings={siblings} currentId={data.id} onNavigate={navigate} />}
    </div>
  )
}
