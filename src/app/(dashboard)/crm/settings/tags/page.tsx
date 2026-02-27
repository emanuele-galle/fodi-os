'use client'

import { useState, useMemo } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Search, ArrowUpDown, Pencil, Merge, Trash2, Tag, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-600',
  'bg-green-500/10 text-green-600',
  'bg-purple-500/10 text-purple-600',
  'bg-amber-500/10 text-amber-600',
  'bg-pink-500/10 text-pink-600',
  'bg-cyan-500/10 text-cyan-600',
  'bg-rose-500/10 text-rose-600',
  'bg-indigo-500/10 text-indigo-600',
]

interface TagData {
  name: string
  clientCount: number
  taskCount: number
  totalCount: number
}

interface ClientOption {
  id: string
  companyName: string
}

type SortKey = 'name' | 'totalCount'

export default function TagManagementPage() {
  const { data: tagsRaw, loading, refetch: refetchTags } = useFetch<{ success: boolean; data: TagData[] }>(
    '/api/crm/tags',
    { init: { headers: { 'x-user-role': 'ADMIN' } } }
  )
  const { data: clientsRaw } = useFetch<{ items: ClientOption[] }>('/api/clients?limit=200')

  const tags = tagsRaw?.success ? tagsRaw.data : []
  const clients = (clientsRaw?.items || []).map((c) => ({ id: c.id, companyName: c.companyName }))

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  // Create tag modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagClientId, setNewTagClientId] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Rename modal
  const [renameTag, setRenameTag] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  // Merge modal
  const [mergeSource, setMergeSource] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState('')
  const [mergeLoading, setMergeLoading] = useState(false)

  // Delete confirm
  const [deleteTag, setDeleteTag] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filteredTags = useMemo(() => {
    let result = tags
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t => t.name.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      const cmp = sortKey === 'name'
        ? a.name.localeCompare(b.name)
        : a.totalCount - b.totalCount
      return sortAsc ? cmp : -cmp
    })
    return result
  }, [tags, search, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  // Create tag by adding it to a client's tags array
  const handleCreate = async () => {
    if (!newTagName.trim() || !newTagClientId) return
    setCreateLoading(true)
    try {
      // First get current client tags
      const clientRes = await fetch(`/api/clients/${newTagClientId}`)
      if (!clientRes.ok) return
      const clientData = await clientRes.json()
      const currentTags: string[] = clientData.data?.tags || clientData.tags || []
      const tagToAdd = newTagName.trim()
      if (currentTags.includes(tagToAdd)) {
        setCreateOpen(false)
        return
      }
      const res = await fetch(`/api/clients/${newTagClientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [...currentTags, tagToAdd] }),
      })
      if (res.ok) {
        setCreateOpen(false)
        setNewTagName('')
        setNewTagClientId('')
        refetchTags()
      }
    } catch (e) {
      console.error('Errore creazione tag:', e)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRename = async () => {
    if (!renameTag || !newName.trim()) return
    setRenameLoading(true)
    try {
      const res = await fetch('/api/crm/tags/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
        body: JSON.stringify({ oldName: renameTag, newName: newName.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setRenameTag(null)
        setNewName('')
        refetchTags()
      }
    } catch (e) {
      console.error('Errore rinomina:', e)
    } finally {
      setRenameLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) return
    setMergeLoading(true)
    try {
      const res = await fetch('/api/crm/tags/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
        body: JSON.stringify({ source: mergeSource, target: mergeTarget }),
      })
      const json = await res.json()
      if (json.success) {
        setMergeSource(null)
        setMergeTarget('')
        refetchTags()
      }
    } catch (e) {
      console.error('Errore merge:', e)
    } finally {
      setMergeLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTag) return
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/crm/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'ADMIN' },
        body: JSON.stringify({ tag: deleteTag }),
      })
      const json = await res.json()
      if (json.success) {
        setDeleteTag(null)
        refetchTags()
      }
    } catch (e) {
      console.error('Errore eliminazione:', e)
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalTags = tags.length
  const totalUsage = tags.reduce((sum, t) => sum + t.totalCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestione Tag</h1>
          <p className="text-muted mt-1">Gestisci, rinomina e unisci i tag di clienti e attività</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Tag
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Tag Totali</p>
          <p className="text-lg font-bold">{totalTags}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Utilizzi Totali</p>
          <p className="text-lg font-bold">{totalUsage}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3 hidden md:block">
          <p className="text-xs text-muted mb-1">Media per Tag</p>
          <p className="text-lg font-bold">{totalTags > 0 ? (totalUsage / totalTags).toFixed(1) : '0'}</p>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('name')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Nome {sortKey === 'name' && (sortAsc ? '(A-Z)' : '(Z-A)')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('totalCount')}
          >
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            Utilizzo {sortKey === 'totalCount' && (sortAsc ? '(min)' : '(max)')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted">Caricamento...</div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {search ? 'Nessun tag trovato' : 'Nessun tag presente. Crea il primo!'}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted">Tag</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-muted">Clienti</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-muted">Attività</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-muted">Totale</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag, i) => (
                <tr key={tag.name} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 text-sm">
                    {tag.clientCount > 0 ? (
                      <Link
                        href={`/crm?tag=${encodeURIComponent(tag.name)}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {tag.clientCount}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      tag.clientCount
                    )}
                  </td>
                  <td className="text-center px-4 py-3 text-sm">{tag.taskCount}</td>
                  <td className="text-center px-4 py-3 text-sm font-medium">{tag.totalCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setRenameTag(tag.name); setNewName(tag.name) }}
                        title="Rinomina"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setMergeSource(tag.name); setMergeTarget('') }}
                        title="Unisci"
                      >
                        <Merge className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTag(tag.name)}
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage bar chart */}
      {!loading && filteredTags.length > 0 && (
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-4">Distribuzione Utilizzo</h2>
          <div className="space-y-2">
            {filteredTags.slice(0, 10).sort((a, b) => b.totalCount - a.totalCount).map((tag, i) => {
              const maxCount = Math.max(...filteredTags.map(t => t.totalCount), 1)
              const pct = (tag.totalCount / maxCount) * 100
              return (
                <div key={tag.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-28 truncate">{tag.name}</span>
                  <div className="flex-1 h-5 bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${TAG_COLORS[i % TAG_COLORS.length].split(' ')[0].replace('/10', '/40')}`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{tag.totalCount}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Tag Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuovo Tag" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Crea un nuovo tag assegnandolo a un cliente.
          </p>
          <Input
            label="Nome Tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="es. VIP, Enterprise, Partner"
          />
          <Select
            label="Assegna al Cliente"
            options={[
              { value: '', label: 'Seleziona cliente...' },
              ...clients.map(c => ({ value: c.id, label: c.companyName }))
            ]}
            value={newTagClientId}
            onChange={(e) => setNewTagClientId(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} loading={createLoading} disabled={!newTagName.trim() || !newTagClientId}>
              Crea Tag
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal open={!!renameTag} onClose={() => setRenameTag(null)} title="Rinomina Tag" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Rinomina <strong>{renameTag}</strong> in tutti i clienti e le attività.
          </p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuovo nome tag"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameTag(null)}>Annulla</Button>
            <Button onClick={handleRename} loading={renameLoading} disabled={!newName.trim() || newName.trim() === renameTag}>
              Rinomina
            </Button>
          </div>
        </div>
      </Modal>

      {/* Merge Modal */}
      <Modal open={!!mergeSource} onClose={() => setMergeSource(null)} title="Unisci Tag" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Unisci <strong>{mergeSource}</strong> in un altro tag. Il tag sorgente verrà rimosso.
          </p>
          <select
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <option value="">Seleziona tag destinazione...</option>
            {tags
              .filter(t => t.name !== mergeSource)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(t => (
                <option key={t.name} value={t.name}>{t.name} ({t.totalCount})</option>
              ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMergeSource(null)}>Annulla</Button>
            <Button onClick={handleMerge} loading={mergeLoading} disabled={!mergeTarget}>
              Unisci
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTag} onClose={() => setDeleteTag(null)} title="Elimina Tag" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Sei sicuro di voler eliminare il tag <strong>{deleteTag}</strong>? Verrà rimosso da tutti i clienti e le attività.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTag(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteLoading}>
              Elimina
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
