'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, FolderKanban, Receipt, Clock, TrendingUp, AlertCircle,
  ArrowRight, Activity, UserPlus, FileText, CheckCircle2, TicketCheck,
  Plus, Zap, TicketPlus, FilePlus2, ClockPlus, X, Pencil,
  LayoutDashboard, CalendarCheck, BarChart3, Wallet, StickyNote, History,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface ActivityItem {
  id: string
  action: string
  entityType: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { firstName: string; lastName: string }
}

interface StatCard {
  label: string
  value: string
  icon: typeof Users
  color: string
  href: string
}

interface TaskItem {
  id: string
  title: string
  dueDate: string
  priority: string
  project?: { name: string } | null
}

interface StickyNote {
  id: string
  text: string
  color: string
}

const NOTE_COLORS = [
  { value: 'bg-yellow-100 border-yellow-200', label: 'Giallo' },
  { value: 'bg-green-100 border-green-200', label: 'Verde' },
  { value: 'bg-blue-100 border-blue-200', label: 'Blu' },
  { value: 'bg-pink-100 border-pink-200', label: 'Rosa' },
]

const STORAGE_KEY = 'fodi-os-sticky-notes'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatCard[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [notes, setNotes] = useState<StickyNote[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setNotes(JSON.parse(stored))
    } catch {}
  }, [])

  function saveNotes(updated: StickyNote[]) {
    setNotes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function addNote() {
    if (notes.length >= 5) return
    const colorIndex = notes.length % NOTE_COLORS.length
    const newNote: StickyNote = {
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

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.firstName) setUserName(d.user.firstName) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function loadDashboard() {
      try {
        const now = new Date()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
        const mondayStr = monday.toISOString().split('T')[0]
        const todayStr = now.toISOString().split('T')[0]
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [clientsRes, projectsRes, quotesRes, timeRes, invoicesRes] = await Promise.all([
          fetch('/api/clients?status=ACTIVE&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/projects?status=IN_PROGRESS&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/quotes?status=SENT&limit=1').then((r) => r.ok ? r.json() : null),
          fetch(`/api/time?from=${mondayStr}&to=${todayStr}&limit=200`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/invoices?status=PAID&limit=200`).then((r) => r.ok ? r.json() : null),
        ])

        const weekHours = (timeRes?.items || []).reduce((s: number, e: { hours: number }) => s + e.hours, 0)
        const revenueMTD = (invoicesRes?.items || [])
          .filter((i: { paidDate: string | null }) => i.paidDate && i.paidDate >= monthStart)
          .reduce((s: number, i: { total: string }) => s + parseFloat(i.total), 0)

        setStats([
          { label: 'Clienti Attivi', value: String(clientsRes?.total ?? 0), icon: Users, color: 'text-primary', href: '/crm?status=ACTIVE' },
          { label: 'Progetti in Corso', value: String(projectsRes?.total ?? 0), icon: FolderKanban, color: 'text-accent', href: '/projects?status=IN_PROGRESS' },
          { label: 'Preventivi Aperti', value: String(quotesRes?.total ?? 0), icon: Receipt, color: 'text-[var(--color-warning)]', href: '/erp/quotes?status=SENT' },
          { label: 'Ore Questa Settimana', value: weekHours.toFixed(1) + 'h', icon: Clock, color: 'text-muted', href: '/time' },
          { label: 'Revenue MTD', value: formatCurrency(revenueMTD), icon: TrendingUp, color: 'text-accent', href: '/erp/reports' },
          { label: 'Ticket Aperti', value: '—', icon: AlertCircle, color: 'text-destructive', href: '/support' },
        ])
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  useEffect(() => {
    fetch('/api/tasks?status=TODO,IN_PROGRESS&sort=dueDate&order=asc&limit=5')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.items) setTasks(d.items)
        else if (Array.isArray(d)) setTasks(d)
      })

    fetch('/api/activity?limit=10')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.items) setActivities(d.items)
      })
  }, [])

  const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
    LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
  }

  const ACTIVITY_ICONS: Record<string, typeof Activity> = {
    project: FolderKanban,
    client: UserPlus,
    quote: FileText,
    invoice: Receipt,
    task: CheckCircle2,
    ticket: TicketCheck,
  }

  function getActivityLabel(activity: ActivityItem): string {
    const meta = activity.metadata || {}
    const name = (meta.name || meta.title || meta.number || '') as string
    const ACTION_LABELS: Record<string, string> = {
      create: 'ha creato',
      update: 'ha aggiornato',
      complete: 'ha completato',
      approve: 'ha approvato',
      pay: 'ha registrato il pagamento di',
      delete: 'ha eliminato',
    }
    const ENTITY_LABELS: Record<string, string> = {
      project: 'il progetto',
      client: 'il cliente',
      quote: 'il preventivo',
      invoice: 'la fattura',
      task: 'il task',
      ticket: 'il ticket',
    }
    const actionLabel = ACTION_LABELS[activity.action] || activity.action
    const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType
    return `${actionLabel} ${entityLabel}${name ? ` "${name}"` : ''}`
  }

  return (
    <div>
      <div className="mb-8 flex items-start gap-4">
        <div className="p-3 rounded-xl shadow-[var(--shadow-md)]" style={{ background: 'var(--gold-gradient)' }}>
          <LayoutDashboard className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}{userName ? <>, <span className="gold-accent">{userName}</span>!</> : '!'}
          </h1>
          <p className="text-sm text-muted mt-1 capitalize">{formatTodayDate()}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8 animate-stagger">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="cursor-pointer shadow-lift glow-gold accent-line-top group"
              onClick={() => router.push(stat.href)}
            >
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.color} transition-transform duration-200 group-hover:scale-110`} style={{ background: `color-mix(in srgb, currentColor 12%, transparent)` }}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted uppercase tracking-wider font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold animate-count-up mt-1 tracking-tight">{stat.value}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 animate-stagger">
        {[
          { label: 'Nuovo Cliente', icon: UserPlus, href: '/crm', color: 'text-primary' },
          { label: 'Nuovo Progetto', icon: FolderKanban, href: '/projects', color: 'text-accent' },
          { label: 'Nuovo Preventivo', icon: FilePlus2, href: '/erp/quotes/new', color: 'text-[var(--color-warning)]' },
          { label: 'Nuovo Ticket', icon: TicketPlus, href: '/support', color: 'text-destructive' },
          { label: 'Registra Ore', icon: ClockPlus, href: '/time', color: 'text-muted' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-card p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:border-primary/20 transition-all duration-200"
          >
            <div className={`p-2.5 rounded-xl ${action.color} transition-transform duration-200 group-hover:scale-110`} style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="accent-line-top shadow-lift">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-primary">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <CardTitle>Task in Scadenza</CardTitle>
              </div>
              <button
                onClick={() => router.push('/projects')}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Vedi tutti
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted py-4">Nessun task in scadenza.</p>
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.project && (
                        <p className="text-xs text-muted mt-0.5">{task.project.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-[10px]">
                        {task.priority}
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

        <Card className="accent-line-top shadow-lift">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-secondary text-accent">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle>Pipeline Commerciale</CardTitle>
            </div>
            <PipelineFunnel />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="accent-line-top shadow-lift">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-secondary text-accent">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle>Fatturato Mensile</CardTitle>
            </div>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="accent-line-top shadow-lift">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-secondary text-[var(--color-warning)]">
                <Wallet className="h-5 w-5" />
              </div>
              <CardTitle>Cash Flow</CardTitle>
            </div>
            <CashFlowChart />
          </CardContent>
        </Card>
      </div>

      {/* Sticky Notes */}
      <div className="mt-6">
        <Card className="accent-line-left shadow-lift">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-[var(--color-warning)]">
                  <StickyNote className="h-5 w-5" />
                </div>
                <CardTitle>Note Rapide</CardTitle>
              </div>
              {notes.length < 5 && (
                <Button variant="ghost" size="sm" onClick={addNote}>
                  <Plus className="h-4 w-4 mr-1" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`relative rounded-xl border p-3 min-h-[100px] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${note.color}`}
                  >
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                      <button
                        onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                        className="p-1 rounded hover:bg-black/5 text-foreground/50 hover:text-foreground/80"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 rounded hover:bg-black/5 text-foreground/50 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
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
                    <div className="absolute bottom-1.5 right-2 text-[9px] text-foreground/30">
                      {note.text.length}/200
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="accent-line-left shadow-lift">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-muted">
                  <History className="h-5 w-5" />
                </div>
                <CardTitle>Attività Recenti</CardTitle>
              </div>
              <Activity className="h-4 w-4 text-muted/40" />
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-muted py-4">Nessuna attività recente.</p>
            ) : (
              <div className="space-y-1">
                {activities.map((activity) => {
                  const ActionIcon = ACTIVITY_ICONS[activity.entityType] || Activity
                  const label = getActivityLabel(activity)
                  return (
                    <div key={activity.id} className="flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors">
                      <div className="p-1.5 rounded-lg bg-secondary text-muted flex-shrink-0 mt-0.5">
                        <ActionIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{activity.user.firstName} {activity.user.lastName}</span>
                          {' '}{label}
                        </p>
                        <p className="text-xs text-muted/70 mt-0.5">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
