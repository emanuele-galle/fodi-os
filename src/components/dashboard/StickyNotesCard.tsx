'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- handlers + dynamic styles */

import { useState } from 'react'
import { StickyNote, Plus, X, Pencil } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { brandClient } from '@/lib/branding-client'

interface StickyNoteItem {
  id: string
  text: string
  color: string
}

const NOTE_COLORS = [
  { value: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', label: 'Giallo' },
  { value: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', label: 'Verde' },
  { value: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', label: 'Blu' },
  { value: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', label: 'Rosa' },
]

const STORAGE_KEY = brandClient.storageKeys.stickyNotes

export function StickyNotesCard() {
  const [notes, setNotes] = useState<StickyNoteItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [editingNote, setEditingNote] = useState<string | null>(null)

  function saveNotes(updated: StickyNoteItem[]) {
    setNotes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function addNote() {
    if (notes.length >= 5) return
    const colorIndex = notes.length % NOTE_COLORS.length
    const newNote: StickyNoteItem = {
      id: Date.now().toString(),
      text: '',
      color: NOTE_COLORS[colorIndex].value,
    }
    saveNotes([...notes, newNote])
    setEditingNote(newNote.id)
  }

  function updateNote(id: string, text: string) {
    saveNotes(notes.map((n) => (n.id === id ? { ...n, text: text.slice(0, 200) } : n)))
  }

  function deleteNote(id: string) {
    saveNotes(notes.filter((n) => n.id !== id))
    if (editingNote === id) setEditingNote(null)
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
              <StickyNote className="h-4 w-4" />
            </div>
            <CardTitle>Note Rapide</CardTitle>
          </div>
          {notes.length < 5 && (
            <Button variant="ghost" size="sm" onClick={addNote}>
              <Plus className="h-4 w-4" />
              Aggiungi
            </Button>
          )}
        </div>
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex p-3 rounded-full bg-secondary text-muted mb-3">
              <StickyNote className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted mb-3">Nessuna nota. Aggiungi un promemoria rapido.</p>
            <Button variant="outline" size="sm" onClick={addNote}>
              <Plus className="h-4 w-4 mr-1" />
              Prima nota
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-edge md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 md:overflow-visible scrollbar-none">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`relative rounded-xl border p-3 min-h-[100px] min-w-[200px] flex-shrink-0 md:min-w-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${note.color}`}
              >
                <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                  <button
                    onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                    className="p-1.5 rounded hover:bg-black/5 text-foreground/50 hover:text-foreground/80"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded hover:bg-black/5 text-foreground/50 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {editingNote === note.id ? (
                  <textarea
                    autoFocus
                    value={note.text}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    onBlur={() => setEditingNote(null)}
                    maxLength={200}
                    className="w-full h-full min-h-[70px] bg-transparent text-xs resize-none focus:outline-none"
                    placeholder="Scrivi una nota..."
                  />
                ) : (
                  <p
                    className="text-xs whitespace-pre-wrap cursor-pointer pr-10"
                    onClick={() => setEditingNote(note.id)}
                  >
                    {note.text || 'Clicca per scrivere...'}
                  </p>
                )}
                <div className="absolute bottom-1.5 right-2 text-xs text-foreground/50">
                  {note.text.length}/200
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
