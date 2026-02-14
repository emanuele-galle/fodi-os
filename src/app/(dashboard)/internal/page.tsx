'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, FolderKanban, Users, CheckSquare, BookOpen, Settings,
  ArrowRight, Clock, ListChecks, Plus, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  status: string
  priority: string
  color: string | null
  workspaceId?: string | null
  _count?: { tasks: number }
  completedTasks?: number
  members?: { user: { id: string; firstName: string; lastName: string; avatar?: string | null } }[]
}

interface WorkspaceItem {
  id: string
  name: string
  slug: string
  color: string
  _count?: { projects: number; members: number }
}

interface TaskItem {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  project?: { name: string } | null
  assignees?: { user: { firstName: string; lastName: string } }[]
}

interface UserItem {
  id: string
  firstName: string
  lastName: string
  avatar?: string | null
  role: string
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PLANNING: 'default', IN_PROGRESS: 'success', ON_HOLD: 'warning', REVIEW: 'default', COMPLETED: 'outline', CANCELLED: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione', IN_PROGRESS: 'In Corso', ON_HOLD: 'In Pausa', REVIEW: 'Revisione', COMPLETED: 'Completato', CANCELLED: 'Cancellato',
}
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
}
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}
const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'var(--color-primary)',
  IN_PROGRESS: 'var(--color-accent)',
  ON_HOLD: 'var(--color-warning)',
  REVIEW: 'var(--color-primary)',
  COMPLETED: 'var(--color-muted)',
  CANCELLED: 'var(--color-destructive)',
}

const QUICK_LINKS = [
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, color: 'text-primary' },
  { label: 'Team', href: '/team', icon: Users, color: 'text-accent' },
  { label: 'Impostazioni', href: '/settings', icon: Settings, color: 'text-muted' },
  { label: 'Progetti Clienti', href: '/projects', icon: FolderKanban, color: 'text-[var(--color-warning)]' },
  { label: 'Task', href: '/tasks', icon: CheckSquare, color: 'text-emerald-600' },
  { label: 'Calendario', href: '/calendar', icon: Clock, color: 'text-purple-600' },
]

export default function InternalPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)

  const fetchData = async () => {
    setFetchError(null)
    try {
      const [projRes, taskRes, userRes] = await Promise.all([
        fetch('/api/projects?isInternal=true&limit=50').then((r) => r.ok ? r.json() : null),
        fetch('/api/tasks?mine=false&limit=20&sort=createdAt&order=desc').then((r) => r.ok ? r.json() : null),
        fetch('/api/users').then((r) => r.ok ? r.json() : null),
      ])
      if (projRes?.items) setProjects(projRes.items)
      else if (Array.isArray(projRes)) setProjects(projRes)

      if (taskRes?.items) setTasks(taskRes.items)
      else if (Array.isArray(taskRes)) setTasks(taskRes)

      if (userRes?.items) setUsers(userRes.items)
      else if (userRes?.users) setUsers(userRes.users)
      else if (Array.isArray(userRes)) setUsers(userRes)

      if (!projRes && !taskRes && !userRes) {
        setFetchError('Errore nel caricamento dei dati')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetch('/api/workspaces').then((r) => r.ok ? r.json() : null).then((d) => {
      const list: WorkspaceItem[] = Array.isArray(d) ? d : d?.items ?? []
      setWorkspaces(list)
    })
  }, [])

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = { isInternal: true }
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    // Convert date fields to ISO datetime
    if (body.startDate) body.startDate = new Date(body.startDate as string).toISOString()
    if (body.endDate) body.endDate = new Date(body.endDate as string).toISOString()
    if (body.deadline) body.deadline = new Date(body.deadline as string).toISOString()
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFormError('')
        setModalOpen(false)
        setLoading(true)
        fetchData()
      } else {
        const data = await res.json().catch(() => null)
        if (data?.details) {
          const msgs = Object.values(data.details).flat().filter(Boolean) as string[]
          setFormError(msgs.join('. ') || data.error || 'Errore nella creazione')
        } else {
          setFormError(data?.error || 'Errore nella creazione del progetto')
        }
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING' || p.status === 'REVIEW')
  const openTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
  const totalTasks = projects.reduce((s, p) => s + (p._count?.tasks ?? 0), 0)
  const completedTasks = projects.reduce((s, p) => s + (p.completedTasks ?? 0), 0)

  function renderProjectCard(p: Project) {
    const totalT = p._count?.tasks ?? 0
    const doneT = p.completedTasks ?? 0
    return (
      <Card
        key={p.id}
        className="cursor-pointer overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] transition-all duration-200 touch-manipulation active:scale-[0.98]"
        onClick={() => router.push(`/projects/${p.id}?from=internal`)}
        style={{ borderTop: `3px solid ${p.color || STATUS_COLORS[p.status] || 'var(--color-primary)'}` }}
      >
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold truncate text-sm md:text-base">{p.name}</span>
            <ArrowRight className="h-4 w-4 text-muted/40 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant={STATUS_BADGE[p.status] || 'default'}>
              {STATUS_LABELS[p.status] || p.status}
            </Badge>
            <Badge variant={PRIORITY_BADGE[p.priority] || 'default'}>
              {PRIORITY_LABELS[p.priority] || p.priority}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>{totalT > 0 ? `${doneT}/${totalT} task` : 'Nessun task'}</span>
          </div>
          {totalT > 0 && (
            <div className="relative">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(doneT / totalT) * 100}%`,
                    background: 'var(--color-primary)',
                  }}
                />
              </div>
              <span className="text-[10px] text-muted mt-1 block text-right">
                {Math.round((doneT / totalT) * 100)}%
              </span>
            </div>
          )}
          {p.members && p.members.length > 0 && (
            <div className="flex items-center gap-1 mt-2 -space-x-1.5">
              {p.members.slice(0, 4).map((m) => (
                <Avatar
                  key={m.user.id}
                  name={`${m.user.firstName} ${m.user.lastName}`}
                  src={m.user.avatar}
                  size="xs"
                  className="ring-2 ring-card"
                />
              ))}
              {p.members.length > 4 && (
                <span className="text-[10px] text-muted ml-2">+{p.members.length - 4}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const stats = [
    { label: 'Progetti Attivi', value: String(activeProjects.length), icon: FolderKanban, color: 'text-primary' },
    { label: 'Task Aperti', value: String(openTasks.length), icon: CheckSquare, color: 'text-accent' },
    { label: 'Completamento', value: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%', icon: ListChecks, color: 'text-emerald-600' },
    { label: 'Membri Team', value: String(users.length), icon: Users, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Azienda</h1>
            <p className="text-xs md:text-sm text-muted">Gestione interna e operazioni FODI</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto Interno
        </Button>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => { setLoading(true); fetchData() }} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-stagger">
          {stats.map((stat) => (
            <Card key={stat.label} className="">
              <CardContent className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${stat.color} transition-transform duration-200`}
                  style={{ background: `color-mix(in srgb, currentColor 12%, transparent)` }}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted uppercase tracking-wider font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progetti Interni */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-secondary text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <CardTitle>Progetti Interni</CardTitle>
          </div>

          {/* Workspace filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedWorkspace(null)}
              className={cn('px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                !selectedWorkspace ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
              )}
            >
              Tutti
            </button>
            {workspaces.filter(w => w.slug !== 'clienti').map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkspace(w.id)}
                className={cn('px-3 py-1.5 min-h-[44px] md:min-h-0 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  selectedWorkspace === w.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
                )}
              >
                {w.name}
              </button>
            ))}
          </div>

          {(() => {
            const internalWorkspaces = workspaces.filter(w => w.slug !== 'clienti')
            const filteredProjects = selectedWorkspace
              ? projects.filter(p => p.workspaceId === selectedWorkspace)
              : projects

            if (filteredProjects.length === 0) {
              return (
                <EmptyState
                  icon={FolderKanban}
                  title="Nessun progetto interno trovato"
                  description="Crea un nuovo progetto per iniziare."
                />
              )
            }

            // When "Tutti" is selected, group by workspace
            if (!selectedWorkspace) {
              const grouped = internalWorkspaces.map(ws => ({
                workspace: ws,
                projects: filteredProjects.filter(p => p.workspaceId === ws.id),
              }))
              const ungrouped = filteredProjects.filter(p => !p.workspaceId || !internalWorkspaces.some(ws => ws.id === p.workspaceId))

              return (
                <div className="space-y-6">
                  {grouped.filter(g => g.projects.length > 0).map(g => (
                    <div key={g.workspace.id}>
                      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{g.workspace.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                        {g.projects.map(p => renderProjectCard(p))}
                      </div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Altro</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                        {ungrouped.map(p => renderProjectCard(p))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                {filteredProjects.map(p => renderProjectCard(p))}
              </div>
            )
          })()}
        </div>
      )}

      {/* Task Recenti */}
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-accent">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <CardTitle>Task Recenti</CardTitle>
              </div>
              <button
                onClick={() => router.push('/tasks')}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Vedi tutti
              </button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="Nessun task trovato" description="I task appariranno qui quando verranno creati." />
            ) : (
              <div className="space-y-1">
                {tasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.project && (
                        <p className="text-xs text-muted mt-0.5">{task.project.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-[10px]">
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-muted tabular-nums">
                          {new Date(task.dueDate).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-secondary text-muted">
            <ArrowRight className="h-5 w-5" />
          </div>
          <CardTitle>Accesso Rapido</CardTitle>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-stagger">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => router.push(link.href)}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:border-primary/20 transition-all duration-200 touch-manipulation active:scale-95 text-left"
            >
              <div
                className={`p-2.5 rounded-xl ${link.color} transition-transform duration-200 group-hover:scale-110 flex-shrink-0`}
                style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}
              >
                <link.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                {link.label}
              </span>
              <ArrowRight className="h-4 w-4 text-muted/40 ml-auto transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Progetto Interno" size="lg">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input name="name" label="Nome Progetto *" required />
          <Select
            name="workspaceId"
            label="Area *"
            options={[
              { value: '', label: 'Seleziona area' },
              ...workspaces.filter(w => w.slug !== 'clienti').map(w => ({ value: w.id, label: w.name })),
            ]}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Select
            name="priority"
            label="Priorità"
            options={[
              { value: 'LOW', label: 'Bassa' },
              { value: 'MEDIUM', label: 'Media' },
              { value: 'HIGH', label: 'Alta' },
              { value: 'URGENT', label: 'Urgente' },
            ]}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="startDate" label="Data Inizio" type="date" />
            <Input name="endDate" label="Data Fine" type="date" />
          </div>
          <Input name="budgetHours" label="Ore Previste" type="number" />
          {formError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Crea Progetto</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
