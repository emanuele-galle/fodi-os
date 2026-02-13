'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface TimeEntry {
  id: string
  date: string
  hours: number
  description: string | null
  billable: boolean
  hourlyRate: string | null
  user: { id: string; firstName: string; lastName: string }
  task?: { id: string; title: string; project?: { id: string; name: string } | null } | null
}

interface ProjectOption {
  id: string
  name: string
}

interface TaskOption {
  id: string
  title: string
}

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const d = new Date(date)
  d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime()) return 'Oggi'
  if (d.getTime() === yesterday.getTime()) return 'Ieri'
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [tasks, setTasks] = useState<TaskOption[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state for modal
  const [formHours, setFormHours] = useState(0)
  const [formMinutes, setFormMinutes] = useState(0)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (projectFilter) params.set('projectId', projectFilter)
      params.set('limit', '100')
      const res = await fetch(`/api/time?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, projectFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    fetch('/api/projects?limit=200').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.items) setProjects(d.items)
    })
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/projects/${selectedProject}/tasks?limit=200`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.items) setTasks(d.items)
          else if (Array.isArray(d)) setTasks(d)
        })
    } else {
      setTasks([])
    }
  }, [selectedProject])

  const totalHours = entries.reduce((s, e) => s + e.hours, 0)
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { dateKey: string; label: string; entries: TimeEntry[]; totalHours: number }[] = []
    const map = new Map<string, TimeEntry[]>()

    for (const entry of entries) {
      const key = getDateKey(entry.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }

    for (const [dateKey, groupEntries] of map) {
      groups.push({
        dateKey,
        label: formatDateLabel(groupEntries[0].date),
        entries: groupEntries,
        totalHours: groupEntries.reduce((s, e) => s + e.hours, 0),
      })
    }

    return groups
  }, [entries])

  function openCreateModal() {
    setEditingEntry(null)
    setFormHours(0)
    setFormMinutes(0)
    setSelectedProject('')
    setModalOpen(true)
  }

  function openEditModal(entry: TimeEntry) {
    setEditingEntry(entry)
    const h = Math.floor(entry.hours)
    const m = Math.round((entry.hours - h) * 60)
    setFormHours(h)
    setFormMinutes(m)
    setSelectedProject(entry.task?.project?.id || '')
    setModalOpen(true)
  }

  async function handleSubmitEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)

    const hours = formHours + formMinutes / 60
    if (hours <= 0) {
      setSubmitting(false)
      return
    }

    const body: Record<string, unknown> = { hours }
    const date = form.get('date') as string
    if (date) body.date = date
    const desc = (form.get('description') as string)?.trim()
    if (desc) body.description = desc
    body.billable = form.get('billable') === 'on'
    const rate = form.get('hourlyRate') as string
    if (rate) body.hourlyRate = parseFloat(rate)
    const taskId = form.get('taskId') as string
    if (taskId) body.taskId = taskId
    const projectId = form.get('projectId') as string
    if (projectId) body.projectId = projectId

    try {
      const isEdit = !!editingEntry
      const url = isEdit ? `/api/time?id=${editingEntry!.id}` : '/api/time'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        setEditingEntry(null)
        fetchEntries()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/time?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        fetchEntries()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Time Tracking</h1>
            <p className="text-sm text-muted">Registrazione e analisi ore lavorate</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Registra Ore
          </Button>
        </div>
        <Button onClick={openCreateModal} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Registra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-stagger">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Totali</p>
              <p className="text-2xl font-bold">{formatHoursMinutes(totalHours)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Fatturabili</p>
              <p className="text-2xl font-bold">{formatHoursMinutes(billableHours)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10 text-accent">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Non Fatturabili</p>
              <p className="text-2xl font-bold">{formatHoursMinutes(totalHours - billableHours)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          label="Dal"
          className="w-full sm:w-44"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          label="Al"
          className="w-full sm:w-44"
        />
        <Select
          label="Progetto"
          options={[
            { value: '', label: 'Tutti i progetti' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nessuna registrazione trovata"
          description="Registra le ore per tracciare il tempo sui progetti."
          action={
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Registra Ore
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedEntries.map((group) => (
            <div key={group.dateKey}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold capitalize">{group.label}</h3>
                <span className="text-xs text-muted font-medium">{formatHoursMinutes(group.totalHours)}</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/80 shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted bg-secondary/40">
                      <th className="py-2.5 px-4 font-medium text-xs uppercase tracking-wider">Utente</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Task</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider">Ore</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Descrizione</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider">Fatt.</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider hidden lg:table-cell text-right">Tariffa</th>
                      <th className="py-2.5 pr-4 font-medium text-xs uppercase tracking-wider w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors even:bg-secondary/20">
                        <td className="py-2.5 px-4">{entry.user.firstName} {entry.user.lastName}</td>
                        <td className="py-2.5 pr-4 text-muted hidden md:table-cell truncate max-w-xs">
                          {entry.task?.title || '—'}
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{formatHoursMinutes(entry.hours)}</td>
                        <td className="py-2.5 pr-4 text-muted hidden lg:table-cell truncate max-w-xs">
                          {entry.description || '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={entry.billable ? 'success' : 'outline'}>
                            {entry.billable ? 'Si' : 'No'}
                          </Badge>
                        </td>
                        <td className="py-2.5 hidden lg:table-cell text-right text-muted">
                          {entry.hourlyRate ? formatCurrency(entry.hourlyRate) + '/h' : '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEditModal(entry)}
                              className="p-1.5 rounded-md hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                              title="Modifica"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingEntry(null) }} title={editingEntry ? 'Modifica Registrazione' : 'Registra Ore'} size="md">
        <form onSubmit={handleSubmitEntry} className="space-y-4">
          <Select
            name="projectId"
            label="Progetto"
            options={[
              { value: '', label: 'Seleziona progetto' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          />
          {tasks.length > 0 && (
            <Select
              name="taskId"
              label="Task"
              options={[
                { value: '', label: 'Seleziona task' },
                ...tasks.map((t) => ({ value: t.id, label: t.title })),
              ]}
              defaultValue={editingEntry?.task?.id || ''}
            />
          )}
          <Input
            name="date"
            label="Data *"
            type="date"
            required
            defaultValue={editingEntry ? getDateKey(editingEntry.date) : ''}
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">Durata *</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={formHours}
                  onChange={(e) => setFormHours(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span className="text-sm text-muted">ore</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(formMinutes)}
                  onChange={(e) => setFormMinutes(parseInt(e.target.value))}
                  options={[
                    { value: '0', label: '0' },
                    { value: '15', label: '15' },
                    { value: '30', label: '30' },
                    { value: '45', label: '45' },
                  ]}
                  className="w-20"
                />
                <span className="text-sm text-muted">min</span>
              </div>
              <span className="text-xs text-muted ml-auto">= {formatHoursMinutes(formHours + formMinutes / 60)}</span>
            </div>
          </div>
          <Input
            name="description"
            label="Descrizione"
            defaultValue={editingEntry?.description || ''}
          />
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="billable"
                defaultChecked={editingEntry ? editingEntry.billable : true}
                className="rounded border-border"
              />
              Fatturabile
            </label>
            <Input
              name="hourlyRate"
              label="Tariffa Oraria"
              type="number"
              step="0.01"
              defaultValue={editingEntry?.hourlyRate || ''}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingEntry(null) }}>Annulla</Button>
            <Button type="submit" loading={submitting}>{editingEntry ? 'Salva' : 'Registra'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Conferma eliminazione" size="sm">
        <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare questa registrazione? L&apos;azione non e reversibile.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annulla</Button>
          <Button variant="destructive" loading={deleting} onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
