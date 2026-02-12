// @ts-nocheck
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
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { MicroExpander } from '@/components/ui/MicroExpander'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { DonutChart, type DonutChartSegment } from '@/components/ui/donut-chart'
import { RecentActivityFeed, type ActivityItem as ActivityFeedItem } from '@/components/ui/dashboard-activities'
import { CommandDeck } from '@/components/ui/command-deck'
import { MorphButton } from '@/components/ui/MorphButton'
import { BonusesIncentivesCard } from '@/components/ui/animated-dashboard-card'
import { MarketingDashboard } from '@/components/ui/dashboard-1'
import { FinancialDashboard } from '@/components/ui/financial-dashboard'
import { ActionSearchBar, type Action } from '@/components/ui/action-search-bar'
import { AreaCharts1 } from '@/components/ui/area-charts-1'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone'
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

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface InvoiceItem {
  id: string
  number: string
  status: string
  total: string
  paidDate?: string | null
  createdAt: string
}

interface ExpenseItem {
  id: string
  amount: string
  description: string
  date: string
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
  const [invoiceDonutData, setInvoiceDonutData] = useState<DonutChartSegment[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [weekHours, setWeekHours] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [allInvoices, setAllInvoices] = useState<InvoiceItem[]>([])
  const [showDropzone, setShowDropzone] = useState(false)

  // Sticky notes - localStorage
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
      try {
        const now = new Date()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
        const mondayStr = monday.toISOString().split('T')[0]
        const todayStr = now.toISOString().split('T')[0]
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const [clientsRes, projectsRes, quotesRes, timeRes, invoicesRes, allInvoicesRes, teamRes, expensesRes] = await Promise.all([
          fetch('/api/clients?status=ACTIVE&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/projects?status=IN_PROGRESS&limit=1').then((r) => r.ok ? r.json() : null),
          fetch('/api/quotes?status=SENT&limit=1').then((r) => r.ok ? r.json() : null),
          fetch(`/api/time?from=${mondayStr}&to=${todayStr}&limit=200`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/invoices?status=PAID&limit=200`).then((r) => r.ok ? r.json() : null),
          fetch('/api/invoices?limit=200').then((r) => r.ok ? r.json() : null),
          fetch('/api/team').then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/expenses?limit=200').then((r) => r.ok ? r.json() : null).catch(() => null),
        ])

        const hours = (timeRes?.items || []).reduce((s: number, e: { hours: number }) => s + e.hours, 0)
        setWeekHours(hours)

        const revenueMTD = (invoicesRes?.items || [])
          .filter((i: { paidDate: string | null }) => i.paidDate && i.paidDate >= monthStart)
          .reduce((s: number, i: { total: string }) => s + parseFloat(i.total), 0)
        setTotalRevenue(revenueMTD)

        const expenses = (expensesRes?.items || [])
          .filter((e: { date: string }) => e.date >= monthStart)
          .reduce((s: number, e: { amount: string }) => s + parseFloat(e.amount), 0)
        setTotalExpenses(expenses)

        // Team members
        const members = teamRes?.items || teamRes?.members || []
        setTeamMembers(Array.isArray(members) ? members : [])

        // All invoices for donut + financial dashboard
        const invoices = allInvoicesRes?.items || []
        setAllInvoices(invoices)

        setStats([
          { label: 'Clienti Attivi', value: String(clientsRes?.total ?? 0), icon: Users, color: 'text-primary', href: '/crm?status=ACTIVE' },
          { label: 'Progetti in Corso', value: String(projectsRes?.total ?? 0), icon: FolderKanban, color: 'text-accent', href: '/projects?status=IN_PROGRESS' },
          { label: 'Preventivi Aperti', value: String(quotesRes?.total ?? 0), icon: Receipt, color: 'text-[var(--color-warning)]', href: '/erp/quotes?status=SENT' },
          { label: 'Ore Questa Settimana', value: hours.toFixed(1) + 'h', icon: Clock, color: 'text-muted', href: '/time' },
          { label: 'Fatturato Mese', value: formatCurrency(revenueMTD), icon: TrendingUp, color: 'text-accent', href: '/erp/reports' },
          { label: 'Ticket Aperti', value: '\u2014', icon: AlertCircle, color: 'text-destructive', href: '/support' },
        ])

        // Donut chart data
        const statusGroups: Record<string, { count: number; total: number }> = {}
        invoices.forEach((inv: { status: string; total: string }) => {
          if (!statusGroups[inv.status]) statusGroups[inv.status] = { count: 0, total: 0 }
          statusGroups[inv.status].count++
          statusGroups[inv.status].total += parseFloat(inv.total)
        })
        const STATUS_COLORS: Record<string, string> = {
          PAID: 'hsl(142, 71%, 45%)', SENT: 'hsl(217, 91%, 60%)',
          OVERDUE: 'hsl(0, 84%, 60%)', DRAFT: 'hsl(220, 9%, 46%)',
        }
        const STATUS_LABELS: Record<string, string> = {
          PAID: 'Pagate', SENT: 'Inviate', OVERDUE: 'Scadute', DRAFT: 'Bozze',
        }
        const donutSegments: DonutChartSegment[] = Object.entries(statusGroups).map(([status, data]) => ({
          label: STATUS_LABELS[status] || status,
          value: data.total,
          color: STATUS_COLORS[status] || 'hsl(220, 9%, 46%)',
        }))
        setInvoiceDonutData(donutSegments)
        setInvoiceTotal(invoices.reduce((s: number, i: { total: string }) => s + parseFloat(i.total), 0))
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  // Load tasks + activities
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
    }
    const ENTITY_LABELS: Record<string, string> = {
      project: 'il progetto', client: 'il cliente', quote: 'il preventivo',
      invoice: 'la fattura', task: 'il task', ticket: 'il ticket',
    }
    const actionLabel = ACTION_LABELS[activity.action] || activity.action
    const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType
    return `${actionLabel} ${entityLabel}${name ? ` "${name}"` : ''}`
  }

  // Recent invoices for FinancialDashboard
  const recentInvoiceActivity = allInvoices.slice(0, 5).map((inv) => ({
    icon: inv.status === 'PAID' ? CheckCircle2 : Receipt,
    title: `Fattura ${inv.number || inv.id.slice(0, 8)}`,
    time: inv.createdAt
      ? formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true, locale: it })
      : '',
    amount: parseFloat(inv.total) * (inv.status === 'PAID' ? 1 : -1),
  }))

  // Quick actions for MorphButton
  const quickActions = [
    { label: 'Nuovo Cliente', icon: <UserPlus className="h-4 w-4" />, href: '/crm', variant: 'secondary' as const },
    { label: 'Nuovo Progetto', icon: <FolderKanban className="h-4 w-4" />, href: '/projects', variant: 'secondary' as const },
    { label: 'Nuovo Preventivo', icon: <FilePlus2 className="h-4 w-4" />, href: '/erp/quotes/new', variant: 'secondary' as const },
    { label: 'Nuovo Ticket', icon: <TicketPlus className="h-4 w-4" />, href: '/support', variant: 'secondary' as const },
    { label: 'Registra Ore', icon: <ClockPlus className="h-4 w-4" />, href: '/time', variant: 'ghost' as const },
  ]

  const searchActions: Action[] = [
    { id: '1', label: 'Nuovo Cliente', icon: <UserPlus className="h-4 w-4 text-primary" />, description: 'CRM', short: '\u2318N', end: 'Azione' },
    { id: '2', label: 'Nuovo Preventivo', icon: <FilePlus2 className="h-4 w-4 text-[var(--color-warning)]" />, description: 'ERP', short: '', end: 'Azione' },
    { id: '3', label: 'Registra Ore', icon: <ClockPlus className="h-4 w-4 text-muted" />, description: 'Time', short: '', end: 'Azione' },
    { id: '4', label: 'Calendario', icon: <CalendarCheck className="h-4 w-4 text-accent" />, description: 'Vai', short: '', end: 'Navigazione' },
    { id: '5', label: 'Report Finanziario', icon: <BarChart3 className="h-4 w-4 text-accent" />, description: 'ERP', short: '', end: 'Report' },
  ]

  return (
    <CommandDeck>
    <div>
      {/* ── HEADER ── */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-3 md:gap-4 mb-1">
          <div className="p-2.5 md:p-3 rounded-2xl shadow-[0_4px_16px_rgba(0,122,255,0.2)]" style={{ background: 'var(--gold-gradient)' }}>
            <LayoutDashboard className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              {getGreeting()}{userName ? <>, <span className="gold-accent">{userName}</span></> : ''}
            </h1>
            <p className="text-xs md:text-sm text-muted mt-1 capitalize">{formatTodayDate()}</p>
          </div>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="mb-6">
        <ActionSearchBar actions={searchActions} />
      </div>

      {/* ── STAT CARDS ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 md:h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 mb-6 md:mb-8 animate-stagger">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => router.push(stat.href)}
              className="relative overflow-hidden rounded-2xl border border-border/30 bg-card p-4 md:p-5 cursor-pointer stat-card-glow group touch-manipulation active:scale-[0.97] transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'var(--gold-gradient)' }} />
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 md:p-3 rounded-2xl ${stat.color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg flex-shrink-0`} style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate animate-count-up">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted uppercase tracking-wider font-medium mt-1 truncate">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── QUICK ACTIONS (MorphButton) ── */}
      <div className="mb-6 md:mb-8">
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible scrollbar-none">
          {quickActions.map((action) => (
            <MorphButton
              key={action.label}
              text={action.label}
              icon={action.icon}
              variant={action.variant}
              size="sm"
              onClick={() => router.push(action.href)}
            />
          ))}
        </div>
      </div>

      {/* ── ROW 1: FATTURATO + CASH FLOW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle>Fatturato Mensile</CardTitle>
            </div>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                <Wallet className="h-5 w-5" />
              </div>
              <CardTitle>Cash Flow</CardTitle>
            </div>
            <CashFlowChart />
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 2: ENTRATE/USCITE + DONUT FATTURE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="flex justify-center">
          <BonusesIncentivesCard
            bonusText="Entrate"
            incentivesText="Uscite"
            bonusesValue={totalRevenue}
            incentivesValue={totalExpenses}
            onMoreDetails={() => router.push('/erp/reports')}
            enableAnimations
          />
        </div>

        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <CardTitle>Distribuzione Fatture</CardTitle>
            </div>
            {invoiceDonutData.length === 0 ? (
              <p className="text-sm text-muted py-4">Nessuna fattura trovata.</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <DonutChart
                  data={invoiceDonutData}
                  size={200}
                  strokeWidth={24}
                  animationDuration={1.2}
                  centerContent={
                    <div className="text-center">
                      <p className="text-xs text-muted uppercase tracking-wider">Totale</p>
                      <p className="text-lg font-bold">{formatCurrency(invoiceTotal)}</p>
                    </div>
                  }
                />
                <div className="flex flex-wrap justify-center gap-3">
                  {invoiceDonutData.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-muted">{seg.label}: {formatCurrency(seg.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 3: TREND ATTIVITA + PIPELINE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>
              <CardTitle>Trend Attività</CardTitle>
            </div>
            <AreaCharts1
              color="var(--color-primary)"
              height={220}
              gradientId="trendArea"
            />
          </CardContent>
        </Card>

        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle>Pipeline Commerciale</CardTitle>
            </div>
            <PipelineFunnel />
          </CardContent>
        </Card>
      </div>

      {/* ── ROW 4: TASK IN SCADENZA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <CardTitle>Task in Scadenza</CardTitle>
              </div>
              <button
                onClick={() => router.push('/projects')}
                className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 transition-all"
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
      </div>

      {/* ── ROW 5: TEAM ACTIVITIES + ATTIVITA RECENTI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <MarketingDashboard
          title="Attività Team"
          className="shadow-lift border-border/20 rounded-2xl max-w-none"
          teamActivities={{
            totalHours: weekHours,
            stats: [
              { label: 'Sviluppo', value: 50, color: 'bg-primary' },
              { label: 'Design', value: 30, color: 'bg-accent' },
              { label: 'Gestione', value: 20, color: 'bg-amber-400' },
            ],
          }}
          team={{
            memberCount: teamMembers.length || 1,
            members: teamMembers.length > 0
              ? teamMembers.map((m) => ({
                  id: m.id,
                  name: `${m.firstName} ${m.lastName}`,
                  avatarUrl: m.avatarUrl || '',
                }))
              : [{ id: '1', name: userName || 'Team', avatarUrl: '' }],
          }}
          cta={{
            text: 'Gestisci il tuo team',
            buttonText: 'Team',
            onButtonClick: () => router.push('/team'),
          }}
        />

        <RecentActivityFeed
          cardTitle="Attività Recenti"
          className="shadow-lift border-border/20 rounded-2xl"
          activities={activities.map((activity) => {
            const ActionIcon = ACTIVITY_ICONS[activity.entityType] || Activity
            const label = getActivityLabel(activity)
            const ICON_COLORS: Record<string, string> = {
              project: 'text-accent bg-accent/10',
              client: 'text-primary bg-primary/10',
              quote: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
              invoice: 'text-accent bg-accent/10',
              task: 'text-primary bg-primary/10',
              ticket: 'text-destructive bg-destructive/10',
            }
            return {
              id: activity.id,
              icon: ActionIcon,
              message: (
                <>
                  <span className="font-bold text-foreground">{activity.user.firstName} {activity.user.lastName}</span>
                  {' '}{label}
                </>
              ),
              timestamp: formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it }),
              iconColorClass: ICON_COLORS[activity.entityType] || 'text-muted-foreground bg-muted',
            }
          })}
        />
      </div>

      {/* ── STICKY NOTES ── */}
      <div className="mb-6">
        <Card className="shadow-lift border-border/20 rounded-2xl">
          <CardContent>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                  <StickyNote className="h-5 w-5" />
                </div>
                <CardTitle>Note Rapide</CardTitle>
              </div>
              {notes.length < 5 && (
                <MicroExpander
                  text="Aggiungi"
                  icon={<Plus className="h-4 w-4" />}
                  variant="ghost"
                  onClick={addNote}
                />
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
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:overflow-visible scrollbar-none">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`relative rounded-xl border p-3 min-h-[100px] min-w-[200px] flex-shrink-0 md:min-w-0 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${note.color}`}
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
            <div className="mt-4 pt-4 border-t border-border/30">
              <MicroExpander
                text="Carica Documento"
                icon={<Plus className="h-4 w-4" />}
                variant="ghost"
                onClick={() => setShowDropzone(!showDropzone)}
              />
              {showDropzone && (
                <div className="mt-3">
                  <Dropzone
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }}
                    maxSize={10 * 1024 * 1024}
                    onDrop={(files) => {
                      console.log('Files dropped:', files)
                    }}
                  >
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AZIONI FINANZIARIE ── */}
      <div className="mb-6">
        <FinancialDashboard
          quickActions={[
            { icon: FilePlus2, title: 'Nuova Fattura', description: 'Crea fattura' },
            { icon: Receipt, title: 'Nuovo Preventivo', description: 'Crea preventivo' },
            { icon: Wallet, title: 'Registra Spesa', description: 'Aggiungi spesa' },
            { icon: BarChart3, title: 'Report', description: 'Vedi report' },
          ]}
          recentActivity={recentInvoiceActivity}
          financialServices={[
            { icon: TrendingUp, title: 'Analisi Revenue', description: 'Trend e previsioni', hasAction: true },
            { icon: Receipt, title: 'Fatturazione Elettronica', description: 'XML FatturaPA', isPremium: true, hasAction: true },
          ]}
        />
      </div>
    </div>
    </CommandDeck>
  )
}
