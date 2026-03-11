'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Library, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { KB_CATEGORIES } from '@/lib/kb-config'

interface ParentOption {
  id: string
  title: string
}

const CATEGORY_OPTIONS = KB_CATEGORIES.map(c => ({ value: c.value, label: c.label }))

export default function NewKbPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('general')
  const [tagsInput, setTagsInput] = useState('')
  const [parentId, setParentId] = useState('')
  const [parents, setParents] = useState<ParentOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchParents = useCallback(async () => {
    try {
      const res = await fetch('/api/kb?limit=100')
      if (res.ok) {
        const data = await res.json()
        const tops = (data.items || [])
          .filter((p: { parentId: string | null }) => !p.parentId)
          .map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))
        setParents(tops)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchParents() }, [fetchParents])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          excerpt: excerpt || undefined,
          category,
          tags,
          parentId: parentId || undefined,
          isPublished: true,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/kb/${data.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Errore nella creazione')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Library className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nuovo Articolo</h1>
          <p className="text-xs text-muted">Crea un nuovo articolo nella Knowledge Base</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Input
          label="Titolo *"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Es. Come funziona il deploy automatico"
        />

        <Textarea
          label="Contenuto * (supporta Markdown)"
          required
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Scrivi il contenuto dell'articolo in Markdown..."
          rows={16}
          className="font-mono text-sm"
        />

        <Input
          label="Estratto"
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          placeholder="Breve descrizione visibile nella card (opzionale)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border/40 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Tag (separati da virgola)"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="docker, deploy, guida"
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">Articolo padre</label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border/40 bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Nessuno (top-level)</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annulla
          </Button>
          <Button type="submit" loading={submitting}>
            Crea Articolo
          </Button>
        </div>
      </form>
    </div>
  )
}
