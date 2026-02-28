'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Save, X, BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgePage {
  id: string
  title: string
  content: string
  category: string
  isActive: boolean
  sortOrder: number
}

const CATEGORIES = [
  { value: 'SERVICES', label: 'Servizi' },
  { value: 'PRICING', label: 'Pricing' },
  { value: 'PROCESSES', label: 'Processi' },
  { value: 'TEAM', label: 'Team' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'OTHER', label: 'Altro' },
]

export default function KnowledgeBasePage() {
  const [pages, setPages] = useState<KnowledgePage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ title: '', content: '', category: 'OTHER', isActive: true })

  const loadPages = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/knowledge')
      if (res.ok) {
        const { data } = await res.json()
        setPages(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)

    try {
      if (editing) {
        await fetch(`/api/ai/knowledge/${editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/ai/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setEditing(null)
      setCreating(false)
      setForm({ title: '', content: '', category: 'OTHER', isActive: true })
      await loadPages()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa pagina?')) return
    await fetch(`/api/ai/knowledge/${id}`, { method: 'DELETE' })
    await loadPages()
  }

  const startEdit = (page: KnowledgePage) => {
    setEditing(page.id)
    setCreating(false)
    setForm({ title: page.title, content: page.content, category: page.category, isActive: page.isActive })
  }

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm({ title: '', content: '', category: 'OTHER', isActive: true })
  }

  const cancel = () => {
    setEditing(null)
    setCreating(false)
    setForm({ title: '', content: '', category: 'OTHER', isActive: true })
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-violet-400" />
          <div>
            <h1 className="text-xl font-bold">Knowledge Base AI</h1>
            <p className="text-sm text-muted-foreground">Informazioni aziendali accessibili all&apos;assistente AI</p>
          </div>
        </div>
        <button
          onClick={startCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nuova pagina
        </button>
      </div>

      {/* Create/Edit form */}
      {(creating || editing) && (
        <div className="mb-6 p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.03]">
          <h3 className="text-sm font-semibold mb-3">{editing ? 'Modifica pagina' : 'Nuova pagina'}</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titolo"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Contenuto (supporta Markdown)"
              rows={8}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-y"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded"
                />
                Attiva
              </label>
              <div className="flex gap-2">
                <button onClick={cancel} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.content.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pages list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nessuna pagina nella knowledge base</p>
          <p className="text-xs mt-1">Aggiungi informazioni aziendali per rendere l&apos;AI più precisa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className={cn(
                'p-4 rounded-xl border transition-colors',
                page.isActive ? 'border-border bg-card' : 'border-border/50 bg-card/50 opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm">{page.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/10 text-violet-400">
                      {CATEGORIES.find(c => c.value === page.category)?.label || page.category}
                    </span>
                    {!page.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/10 text-yellow-500">Disattiva</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{page.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(page)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
