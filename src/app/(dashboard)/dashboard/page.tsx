'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, FolderKanban, Receipt, Clock, TrendingUp, AlertCircle,
  Activity, UserPlus, FileText, CheckCircle2, TicketCheck,
  Plus, TicketPlus, FilePlus2, ClockPlus, X, Pencil,
  LayoutDashboard, CalendarCheck, BarChart3, Wallet, StickyNote,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard'
import { TeamActivityCard } from '@/components/dashboard/TeamActivityCard'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart').then(m => ({ default: m.RevenueChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const CashFlowChart = dynamic(() => import('@/components/dashboard/CashFlowChart').then(m => ({ default: m.CashFlowChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const PipelineFunnel = dynamic(() => import('@/components/dashboard/PipelineFunnel').then(m => ({ default: m.PipelineFunnel })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const InvoiceStatusChart = dynamic(() => import('@/components/dashboard/InvoiceStatusChart').then(m => ({ default: m.InvoiceStatusChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const ActivityTrendChart = dynamic(() => import('@/components/dashboard/ActivityTrendChart').then(m => ({ default: m.ActivityTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
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

interface StickyNoteItem {
  id: string
  text: string
  color: string
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface ChartSegment {
  label: string
  value: number
  color: string
}

const NOTE_COLORS = [
  { value: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', label: 'Giallo' },
  { value: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', label: 'Verde' },
  { value: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', label: 'Blu' },
  { value: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', label: 'Rosa' },
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
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [notes, setNotes] = useState<StickyNoteItem[]>([])
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [invoiceDonutData, setInvoiceDonutData] = useState<ChartSegment[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [weekHours, setWeekHours] = useState(0)
  const [weekBillableHours, setWeekBillableHours] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)

  // Sticky notes - localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setNotes(JSON.parse(stored))
    } catch {}
  }, [])

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

  // Load session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.firstName) setUserName(d.user.firstName) })
      .catch(() => {})
  }, [])

  // Load dashboard data
  useEffect(() => {
    async function loadDashboard() {
      setFetchError(null)
      try {
        const now = new Date()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
        const mondayStr = monday.toISOString().split('T')[0]
        const todayStr = now.toISOString().split('T')[0]
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [clientsRes, projectsRes, quotesRes, timeRes, invoicesRes, allInvoicesRes, teamRes, expensesRes, ticketsRes, tasksRes, activityRes] = await Promise.all([
          fetch('/api/clients?status=ACTIVE&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/projects?status=IN_PROGRESS&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/quotes?status=SENT&limit=1').then((r) => r.ok ? r.json() : null),
          fetch(`/api/time?from=${mondayStr}&to=${todayStr}&limit=200`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/invoices?status=PAID&limit=200`).then((r) => r.ok ? r.json() : null),
          fetch('/api/invoices?limit=200').then((r) => r.ok ? r.json() : null),
          fetch('/api/team').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/tickets?status=OPEN,IN_PROGRESS,WAITING_CLIENT&limit=1').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/tasks?status=TODO,IN_PROGRESS&sort=dueDate&order=asc&limit=5').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/activity?limit=10').then((r) => r.ok ? r.json() : null).catch(() => null),
        ])

        // Tasks + Activities (fetched in parallel with everything else)
        if (tasksRes?.items) setTasks(tasksRes.items)
        else if (Array.isArray(tasksRes)) setTasks(tasksRes)
        if (activityRes?.items) setActivities(activityRes.items)

        const timeItems = timeRes?.items || []
        const hours = timeItems.reduce((s: number, e: { hours: number }) => s + e.hours, 0)
        const billable = timeItems.filter((e: { billable: boolean }) => e.billable).reduce((s: number, e: { hours: number }) => s + e.hours, 0)
        setWeekHours(hours)
        setWeekBillableHours(billable)

        const revenueMTD = (invoicesRes?.items || [])
          .filter((i: { paidDate: string | null }) => i.paidDate && i.paidDate >= monthStart)
          .reduce((s: number, i: { total: string }) => s + parseFloat(i.total), 0)
        setTotalRevenue(revenueMTD)

        const expenses = (expensesRes?.items || [])
          .filter((e: { date: string }) => e.date >= monthStart)
          .reduce((s: number, e: { amount: string }) => s + parseFloat(e.amount), 0)
        setTotalExpenses(expenses)

        const members = teamRes?.items || teamRes?.members || []
        setTeamMembers(Array.isArray(members) ? members : [])

        const invoices = allInvoicesRes?.items || []

        setStats([
          { label: 'Clienti Attivi', value: String(clientsRes?.total ?? 0), icon: Users, color: 'text-primary', href: '/crm?status=ACTIVE' },
          { label: 'Progetti in Corso', value: String(projectsRes?.total ?? 0), icon: FolderKanban, color: 'text-accent', href: '/projects?status=IN_PROGRESS' },
          { label: 'Preventivi Aperti', value: String(quotesRes?.total ?? 0), icon: Receipt, color: 'text-[var(--color-warning)]', href: '/erp/quotes?status=SENT' },
          { label: 'Ore Questa Settimana', value: hours.toFixed(1) + 'h', icon: Clock, color: 'text-muted', href: '/time' },
          { label: 'Fatturato Mese', value: formatCurrency(revenueMTD), icon: TrendingUp, color: 'text-accent', href: '/erp/reports' },
          { label: 'Ticket Aperti', value: String(ticketsRes?.total ?? 0), icon: AlertCircle, color: 'text-destructive', href: '/support' },
        ])

        // Donut chart data
        const statusGroups: Record<string, { count: number; total: number }> = {}
        invoices.forEach((inv: { status: string; total: string }) => {
          if (!statusGroups[inv.status]) statusGroups[inv.status] = { count: 0, total: 0 }
          statusGroups[inv.status].count++
          statusGroups[inv.status].total += parseFloat(inv.total)
        })
        const STATUS_COLORS: Record<string, string> = {
          PAID: '#059669', SENT: '#4F46E5',
          OVERDUE: '#DC2626', DRAFT: '#8C8680',
        }
        const STATUS_LABELS: Record<string, string> = {
          PAID: 'Pagate', SENT: 'Inviate', OVERDUE: 'Scadute', DRAFT: 'Bozze',
        }
        const donutSegments: ChartSegment[] = Object.entries(statusGroups).map(([status, data]) => ({
          label: STATUS_LABELS[status] || status,
          value: data.total,
          color: STATUS_COLORS[status] || '#8C8680',
        }))
        setInvoiceDonutData(donutSegments)
        setInvoiceTotal(invoices.reduce((s: number, i: { total: string }) => s + parseFloat(i.total), 0))
      } catch {
        setFetchError('Errore nel caricamento dei dati della dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])


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
      create: 'ha creato', update: 'ha aggiornato', complete: 'ha completato',
      approve: 'ha approvato', pay: 'ha registrato il pagamento di', delete: 'ha eliminato',
      AUTO_TIME_LOG: 'ha registrato ore di lavoro', TIMER_STOP: 'ha fermato il timer',
    }
    const ENTITY_LABELS: Record<string, string> = {
      project: 'il progetto', client: 'il cliente', quote: 'il preventivo',
      invoice: 'la fattura', task: 'il task', ticket: 'il ticket',
      TimeEntry: '', timeEntry: '',
    }
    // Handle special action types that are self-descriptive
    if (ACTION_LABELS[activity.action] && (activity.entityType === 'TimeEntry' || activity.entityType === 'timeEntry')) {
      return ACTION_LABELS[activity.action] + (name ? ` su "${name}"` : '')
    }
    const actionLabel = ACTION_LABELS[activity.action] || activity.action
    const entityLabel = ENTITY_LABELS[activity.entityType] ?? activity.entityType
    return `${actionLabel} ${entityLabel}${name ? ` "${name}"` : ''}`
  }

  const ICON_COLORS: Record<string, string> = {
    project: 'text-accent bg-accent/10',
    client: 'text-primary bg-primary/10',
    quote: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
    invoice: 'text-accent bg-accent/10',
    task: 'text-primary bg-primary/10',
    ticket: 'text-destructive bg-destructive/10',
  }

  const quickActions = [
    { label: 'Nuovo Cliente', description: 'Aggiungi cliente', icon: UserPlus, href: '/crm', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
    { label: 'Nuovo Progetto', description: 'Crea progetto', icon: FolderKanban, href: '/projects', color: 'text-accent', bg: 'bg-accent/10', hoverBorder: 'hover:border-accent/30' },
    { label: 'Nuovo Preventivo', description: 'Crea preventivo', icon: FilePlus2, href: '/erp/quotes/new', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10', hoverBorder: 'hover:border-[var(--color-warning)]/30' },
    { label: 'Nuovo Ticket', description: 'Apri ticket', icon: TicketPlus, href: '/support', color: 'text-destructive', bg: 'bg-destructive/10', hoverBorder: 'hover:border-destructive/30' },
    { label: 'Registra Ore', description: 'Traccia tempo', icon: ClockPlus, href: '/time', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
  ]

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {getGreeting()}{userName ? <>, <span className="text-primary font-bold">{userName}</span></> : ''}
            </h1>
            <p className="text-xs text-muted capitalize">{formatTodayDate()}</p>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* STAT CARDS */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3 mb-6 animate-stagger">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="relative overflow-hidden rounded-xl border border-border/30 bg-card px-3 py-2.5 cursor-pointer hover:border-primary/20 transition-colors group touch-manipulation active:scale-[0.97]"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${stat.color} flex-shrink-0 transition-all duration-300 group-hover:scale-110`} style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight truncate tabular-nums leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted font-medium truncate leading-tight">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="mb-6 md:mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`group relative flex flex-col items-center gap-2 p-4 md:p-5 rounded-xl border border-border/30 ${action.hoverBorder} bg-card hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.97]`}
              >
                <div className={`p-2.5 md:p-3 rounded-xl ${action.bg} ${action.color} transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-sm font-semibold leading-tight">{action.label}</p>
                  <p className="text-[10px] md:text-xs text-muted mt-0.5 hidden sm:block">{action.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ROW 1: FATTURATO + CASH FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle>Fatturato Mensile</CardTitle>
            </div>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                <Wallet className="h-4 w-4" />
              </div>
              <CardTitle>Cash Flow</CardTitle>
            </div>
            <CashFlowChart />
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: FINANCIAL SUMMARY + INVOICE DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <FinancialSummaryCard
          income={totalRevenue}
          expenses={totalExpenses}
          onViewDetails={() => router.push('/erp/reports')}
        />
        <InvoiceStatusChart data={invoiceDonutData} total={invoiceTotal} />
      </div>

      {/* ROW 3: TREND + PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </div>
              <CardTitle>Trend Attività</CardTitle>
            </div>
            <ActivityTrendChart />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <TrendingUp className="h-4 w-4" />
              </div>
              <CardTitle>Pipeline Commerciale</CardTitle>
            </div>
            <PipelineFunnel />
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: TASK IN SCADENZA + TEAM ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <CardTitle>Task in Scadenza</CardTitle>
              </div>
              <button
                onClick={() => router.push('/projects')}
                className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-all"
              >
                Vedi tutti
              </button>
            </div>
            {tasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nessun task in scadenza" description="Ottimo lavoro! Non ci sono task con scadenza imminente." />
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.project && (
                        <p className="text-xs text-muted mt-0.5">{task.project.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <StatusBadge
                        leftLabel={task.priority === 'URGENT' ? 'Urgente' : task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Media' : 'Bassa'}
                        rightLabel={task.dueDate ? new Date(task.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '\u2014'}
                        variant={task.priority === 'URGENT' ? 'error' : task.priority === 'HIGH' ? 'warning' : task.priority === 'MEDIUM' ? 'info' : 'default'}
                        pulse={task.priority === 'URGENT'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <TeamActivityCard
          totalHours={weekHours}
          breakdown={weekHours > 0 ? [
            { label: 'Fatturabili', value: Math.round((weekBillableHours / weekHours) * 100), color: 'bg-primary' },
            { label: 'Non fatt.', value: Math.round(((weekHours - weekBillableHours) / weekHours) * 100), color: 'bg-amber-400' },
          ] : [
            { label: 'Fatturabili', value: 0, color: 'bg-primary' },
            { label: 'Non fatt.', value: 0, color: 'bg-amber-400' },
          ]}
          members={teamMembers.length > 0
            ? teamMembers.map((m) => ({
                id: m.id,
                name: `${m.firstName} ${m.lastName}`,
                avatarUrl: m.avatarUrl || undefined,
              }))
            : [{ id: '1', name: userName || 'Team', avatarUrl: undefined }]
          }
          onManageTeam={() => router.push('/team')}
        />
      </div>

      {/* ROW 5: ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ActivityTimeline
          activities={activities.map((activity) => {
            const ActionIcon = ACTIVITY_ICONS[activity.entityType] || Activity
            const label = getActivityLabel(activity)
            return {
              id: activity.id,
              icon: ActionIcon,
              message: (
                <>
                  <span className="font-semibold text-foreground">{activity.user.firstName} {activity.user.lastName}</span>
                  {' '}{label}
                </>
              ),
              timestamp: formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it }),
              iconColorClass: ICON_COLORS[activity.entityType] || 'text-muted bg-secondary',
            }
          })}
        />

        {/* STICKY NOTES */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
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
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 md:overflow-visible scrollbar-none">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`relative rounded-lg border p-3 min-h-[100px] min-w-[200px] flex-shrink-0 md:min-w-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${note.color}`}
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



    </div>
  )
}
