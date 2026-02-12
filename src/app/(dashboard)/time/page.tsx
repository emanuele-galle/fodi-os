'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MorphButton } from '@/components/ui/MorphButton'
import { MicroExpander } from '@/components/ui/MicroExpander'
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
  user: { firstName: string; lastName: string }
  task?: { id: string; title: string } | null
}

interface ProjectOption {
  id: string
  name: string
}

interface TaskOption {
  id: string
  title: string
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

  async function handleAddEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {}
    form.forEach((v, k) => {
      if (k === 'billable') {
        body[k] = v === 'on'
      } else if (typeof v === 'string' && v.trim()) {
        body[k] = v.trim()
      }
    })
    if (body.hours) body.hours = parseFloat(body.hours as string)
    if (body.hourlyRate) body.hourlyRate = parseFloat(body.hourlyRate as string)
    if (!body.billable) body.billable = false
    try {
      const res = await fetch('/api/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModalOpen(false)
        fetchEntries()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Time Tracking</h1>
            <p className="text-sm text-muted">Registrazione e analisi ore lavorate</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <MicroExpander
            text="Registra Ore"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setModalOpen(true)}
          />
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Registra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-stagger">
        <Card className="shadow-lift accent-line-top">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Totali</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lift accent-line-top">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Fatturabili</p>
              <p className="text-2xl font-bold">{billableHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lift accent-line-top">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent/10 text-accent">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-medium">Ore Non Fatturabili</p>
              <p className="text-2xl font-bold">{(totalHours - billableHours).toFixed(1)}h</p>
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
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registra Ore
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/80 shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted bg-secondary/40">
                <th className="py-3 px-4 font-medium text-xs uppercase tracking-wider">Data</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider">Utente</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Task</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider">Ore</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Descrizione</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider">Fatturabile</th>
                <th className="py-3 pr-4 font-medium text-xs uppercase tracking-wider hidden lg:table-cell text-right">Tariffa</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors even:bg-secondary/20">
                  <td className="py-3 px-4">{new Date(entry.date).toLocaleDateString('it-IT')}</td>
                  <td className="py-3 pr-4">{entry.user.firstName} {entry.user.lastName}</td>
                  <td className="py-3 pr-4 text-muted hidden md:table-cell truncate max-w-xs">
                    {entry.task?.title || '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium">{entry.hours}h</td>
                  <td className="py-3 pr-4 text-muted hidden lg:table-cell truncate max-w-xs">
                    {entry.description || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={entry.billable ? 'success' : 'outline'}>
                      {entry.billable ? 'Si' : 'No'}
                    </Badge>
                  </td>
                  <td className="py-3 hidden lg:table-cell text-right text-muted">
                    {entry.hourlyRate ? formatCurrency(entry.hourlyRate) + '/h' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registra Ore" size="md">
        <form onSubmit={handleAddEntry} className="space-y-4">
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
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" label="Data *" type="date" required />
            <Input name="hours" label="Ore *" type="number" step="0.25" min="0.25" required />
          </div>
          <Input name="description" label="Descrizione" />
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="billable" defaultChecked className="rounded border-border" />
              Fatturabile
            </label>
            <Input name="hourlyRate" label="Tariffa Oraria" type="number" step="0.01" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <MorphButton type="submit" text="Registra" isLoading={submitting} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
