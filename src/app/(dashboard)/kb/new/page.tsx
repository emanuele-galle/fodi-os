'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Library } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'technical', label: 'Tecnico' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'faq', label: 'FAQ' },
]

export default function NewKbPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('general')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, excerpt: excerpt || undefined, category, tags }),
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
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Library className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Nuovo Articolo</h1>
          <p className="text-xs md:text-sm text-muted">Crea un nuovo articolo nella Knowledge Base</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Input
          label="Titolo *"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Come configurare il deploy automatico"
        />

        <Textarea
          label="Contenuto *"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Scrivi il contenuto dell'articolo (supporta Markdown)..."
          rows={12}
        />

        <Input
          label="Estratto"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Breve descrizione dell'articolo (opzionale)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoria"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Input
            label="Tag (separati da virgola)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="docker, deploy, guida"
          />
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
