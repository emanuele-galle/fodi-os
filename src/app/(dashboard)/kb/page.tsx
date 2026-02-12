'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Search, ChevronRight, FolderOpen, FileText, Edit } from 'lucide-react'
import { MicroExpander } from '@/components/ui/MicroExpander'
import { WikiPageComments } from '@/components/kb/WikiPageComments'
import { Button } from '@/components/ui/Button'
import { MorphButton } from '@/components/ui/MorphButton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { RichTextEditor } from '@/components/shared/RichTextEditor'

interface WikiPage {
  id: string
  title: string
  slug: string
  category: string
  content: string
  parentId: string | null
  children?: WikiPage[]
  breadcrumb?: { id: string; title: string }[]
  createdAt: string
  updatedAt: string
}

const CATEGORY_TABS = [
  { value: '', label: 'Tutti' },
  { value: 'sop', label: 'SOP' },
  { value: 'guide', label: 'Guide' },
  { value: 'academy', label: 'Academy' },
  { value: 'snippet', label: 'Snippet' },
]

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'sop', label: 'SOP' },
  { value: 'guide', label: 'Guida' },
  { value: 'academy', label: 'Academy' },
  { value: 'snippet', label: 'Snippet' },
]

const CATEGORY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  general: 'default',
  sop: 'warning',
  guide: 'success',
  academy: 'default',
  snippet: 'outline',
}

function TreeItem({
  page,
  selectedId,
  onSelect,
  depth = 0,
}: {
  page: WikiPage
  selectedId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = page.children && page.children.length > 0

  return (
    <div>
      <button
        onClick={() => {
          onSelect(page.id)
          if (hasChildren) setExpanded(!expanded)
        }}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left ${
          selectedId === page.id
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-foreground hover:bg-secondary'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
        )}
        <span className="truncate">{page.title}</span>
      </button>
      {expanded && hasChildren && (
        <div>
          {page.children!.map((child) => (
            <TreeItem
              key={child.id}
              page={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBasePage() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchPages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/wiki?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPages(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  useEffect(() => {
    if (!selectedPageId) {
      setSelectedPage(null)
      return
    }
    setLoadingPage(true)
    fetch(`/api/wiki/${selectedPageId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSelectedPage(data)
      })
      .finally(() => setLoadingPage(false))
  }, [selectedPageId])

  // Build tree from flat pages
  function buildTree(flatPages: WikiPage[]): WikiPage[] {
    const map = new Map<string, WikiPage>()
    const roots: WikiPage[] = []
    flatPages.forEach((p) => map.set(p.id, { ...p, children: [] }))
    map.forEach((p) => {
      if (p.parentId && map.has(p.parentId)) {
        map.get(p.parentId)!.children!.push(p)
      } else {
        roots.push(p)
      }
    })
    return roots
  }

  const tree = buildTree(pages)

  // Flat list for parent select in modal
  const parentOptions = [
    { value: '', label: 'Nessuna (root)' },
    ...pages.map((p) => ({ value: p.id, label: p.title })),
  ]

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {}
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (editorContent) body.content = editorContent
    try {
      const res = await fetch('/api/wiki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        setEditorContent('')
        fetchPages()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function startEditing() {
    if (!selectedPage) return
    setEditContent(selectedPage.content || '')
    setEditing(true)
  }

  async function saveEdit() {
    if (!selectedPage) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/wiki/${selectedPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSelectedPage(updated)
        setEditing(false)
        fetchPages()
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const [showTree, setShowTree] = useState(false)

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted">Documenti, guide e procedure del team</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTree(!showTree)}
            className="lg:hidden px-3 py-2 rounded-md border border-border text-xs font-medium hover:bg-secondary transition-colors touch-manipulation min-h-[44px]"
          >
            {showTree ? 'Nascondi Albero' : 'Mostra Albero'}
          </button>
          <div className="hidden sm:block">
            <MicroExpander
              text="Nuova Pagina"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setModalOpen(true)}
            />
          </div>
          <Button onClick={() => setModalOpen(true)} className="sm:hidden">
            <Plus className="h-4 w-4 mr-1" />
            Nuova
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar - Tree Navigation: hidden on mobile by default */}
        <div className={`w-full lg:w-72 shrink-0 ${showTree ? 'block' : 'hidden lg:block'}`}>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-1 mb-3 flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setCategoryFilter(tab.value)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  categoryFilter === tab.value
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="border border-border rounded-lg p-2 max-h-[60vh] overflow-auto animate-fade-in glass-card">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted" />
                Nessuna pagina trovata
              </div>
            ) : (
              tree.map((page) => (
                <TreeItem
                  key={page.id}
                  page={page}
                  selectedId={selectedPageId}
                  onSelect={setSelectedPageId}
                />
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 border border-border rounded-lg p-4 md:p-6 min-h-[400px] animate-fade-in glass-card">
          {loadingPage ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedPage ? (
            <div>
              {/* Breadcrumb */}
              {selectedPage.breadcrumb && selectedPage.breadcrumb.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted mb-3">
                  {selectedPage.breadcrumb.map((crumb, i) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3" />}
                      <button
                        onClick={() => setSelectedPageId(crumb.id)}
                        className="hover:text-primary transition-colors"
                      >
                        {crumb.title}
                      </button>
                    </span>
                  ))}
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground">{selectedPage.title}</span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold">{selectedPage.title}</h2>
                <Badge variant={CATEGORY_BADGE[selectedPage.category] || 'default'}>
                  {selectedPage.category}
                </Badge>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <RichTextEditor
                    content={editContent}
                    onChange={setEditContent}
                    placeholder="Scrivi il contenuto della pagina..."
                  />
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                      {savingEdit ? 'Salvataggio...' : 'Salva'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <RichTextEditor
                    content={selectedPage.content || ''}
                    onChange={() => {}}
                    editable={false}
                    placeholder="Nessun contenuto."
                  />
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" onClick={startEditing}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                  </div>
                </>
              )}

              <WikiPageComments pageId={selectedPage.id} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpen className="h-12 w-12 text-muted mb-4" />
              <h3 className="text-lg font-medium">Benvenuto nella Knowledge Base</h3>
              <p className="text-sm text-muted mt-1 max-w-md">
                Seleziona una pagina dal menu laterale per visualizzarla, oppure crea una nuova pagina.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Pagina" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="title" label="Titolo *" required />
          <Select name="parentId" label="Pagina Genitore" options={parentOptions} />
          <Select name="category" label="Categoria *" options={CATEGORY_OPTIONS} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contenuto</label>
            <RichTextEditor
              content={editorContent}
              onChange={setEditorContent}
              placeholder="Scrivi il contenuto della pagina..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annulla
            </Button>
            <MorphButton type="submit" text="Crea Pagina" isLoading={submitting} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
