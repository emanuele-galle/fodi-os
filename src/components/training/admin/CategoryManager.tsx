'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, X,
  FolderOpen,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  type: 'INTERNAL' | 'USER'
  sortOrder: number
  _count: { courses: number }
}

interface CategoryForm {
  name: string
  slug: string
  description: string
  icon: string
  type: 'INTERNAL' | 'USER'
  sortOrder: number
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  type: 'USER',
  sortOrder: 0,
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/training/categories', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      icon: cat.icon ?? '',
      type: cat.type,
      sortOrder: cat.sortOrder,
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : slugify(name),
    }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Nome e slug sono obbligatori')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        icon: form.icon.trim() || null,
        type: form.type,
        sortOrder: form.sortOrder,
      }

      const url = editingId
        ? `/api/training/categories/${editingId}`
        : '/api/training/categories'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'Errore nel salvataggio')
      }

      closeForm()
      await fetchCategories()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/training/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.error ?? 'Errore nella cancellazione')
      } else {
        setDeleteConfirmId(null)
        await fetchCategories()
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= categories.length) return

    const current = categories[idx]
    const swap = categories[swapIdx]

    // Swap sort orders
    await Promise.all([
      fetch(`/api/training/categories/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sortOrder: swap.sortOrder }),
      }),
      fetch(`/api/training/categories/${swap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      }),
    ])

    await fetchCategories()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Categorie</h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuova Categoria
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? 'Modifica Categoria' : 'Nuova Categoria'}
            </h3>
            <button onClick={closeForm} className="text-muted hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Es. Sicurezza sul Lavoro"
                className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="sicurezza-sul-lavoro"
                className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Icona (nome lucide)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                placeholder="Es. shield, book-open"
                className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'INTERNAL' | 'USER' }))}
                className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              >
                <option value="USER">Formazione Utente</option>
                <option value="INTERNAL">Formazione Interna</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Ordine</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                className="flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Descrizione</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Descrizione opzionale..."
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border/50 text-muted hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? 'Salva Modifiche' : 'Crea Categoria'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-10 w-10 text-muted/40 mb-3" />
          <p className="text-sm text-muted">Nessuna categoria creata</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
          {categories.map((cat, idx) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(cat.id, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleReorder(cat.id, 'down')}
                  disabled={idx === categories.length - 1}
                  className="p-0.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-secondary/60 flex items-center justify-center text-sm">
                {cat.icon || '📁'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    cat.type === 'INTERNAL'
                      ? 'bg-violet-500/10 text-violet-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {cat.type === 'INTERNAL' ? 'Interna' : 'Utente'}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {cat._count.courses} {cat._count.courses === 1 ? 'corso' : 'corsi'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  title="Modifica"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleteConfirmId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={saving}
                      className="px-2 py-1 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                    >
                      Conferma
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(cat.id)}
                    className="p-1.5 text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
