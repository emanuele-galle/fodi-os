'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, FolderKanban, Receipt, Clock, TrendingUp, AlertCircle,
  Activity, UserPlus, FileText, CheckCircle2, TicketCheck,
  LayoutDashboard, BarChart3, Wallet,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { getDueUrgency } from '@/lib/task-utils'
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard'
import { TeamActivityCard } from '@/components/dashboard/TeamActivityCard'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { MobileChartTabs } from '@/components/dashboard/MobileChartTabs'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { StatCarousel } from '@/components/dashboard/StatCarousel'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import { ForYouSection } from '@/components/dashboard/ForYouSection'
import { TasksDeadlineCard } from '@/components/dashboard/TasksDeadlineCard'
import { OperativeSummaryCard } from '@/components/dashboard/OperativeSummaryCard'
import { StickyNotesCard } from '@/components/dashboard/StickyNotesCard'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart').then(m => ({ default: m.RevenueChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-64 w-full rounded-lg" />,
})
const CashFlowChart = dynamic(() => import('@/components/dashboard/CashFlowChart').then(m => ({ default: m.CashFlowChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-64 w-full rounded-lg" />,
})
const PipelineFunnel = dynamic(() => import('@/components/dashboard/PipelineFunnel').then(m => ({ default: m.PipelineFunnel })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-64 w-full rounded-lg" />,
})
const ActivityTrendChart = dynamic(() => import('@/components/dashboard/ActivityTrendChart').then(m => ({ default: m.ActivityTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-64 w-full rounded-lg" />,
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
  dueDate: string | null
  status: string
  priority: string
  project?: { name: string } | null
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

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

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  project: FolderKanban,
  client: UserPlus,
  quote: FileText,
  task: CheckCircle2,
  ticket: TicketCheck,
}

const ICON_COLORS: Record<string, string> = {
  project: 'text-accent bg-accent/10',
  client: 'text-primary bg-primary/10',
  quote: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
  task: 'text-primary bg-primary/10',
  ticket: 'text-destructive bg-destructive/10',
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
    task: 'il task', ticket: 'il ticket',
    TimeEntry: '', timeEntry: '',
  }
  if (ACTION_LABELS[activity.action] && (activity.entityType === 'TimeEntry' || activity.entityType === 'timeEntry')) {
    return ACTION_LABELS[activity.action] + (name ? ` su "${name}"` : '')
  }
  const actionLabel = ACTION_LABELS[activity.action] || activity.action
  const entityLabel = ENTITY_LABELS[activity.entityType] ?? activity.entityType
  return `${actionLabel} ${entityLabel}${name ? ` "${name}"` : ''}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatCard[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [weekHours, setWeekHours] = useState(0)
  const [weekBillableHours, setWeekBillableHours] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [overdueTaskCount, setOverdueTaskCount] = useState(0)
  const [todayTaskCount, setTodayTaskCount] = useState(0)
  const [inProgressTaskCount, setInProgressTaskCount] = useState(0)
  const [completedMonthCount, setCompletedMonthCount] = useState(0)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.firstName) setUserName(d.user.firstName) })
      .catch(() => {})
  }, [])

  function processDashboardData(data: Record<string, unknown>) {
    const taskItems: TaskItem[] = (data.tasks as { items?: TaskItem[] })?.items || []
    setTasks(taskItems)
    if ((data.activity as { items?: ActivityItem[] })?.items) setActivities((data.activity as { items: ActivityItem[] }).items)

    let overdue = 0, dueToday = 0
    for (const t of taskItems) {
      const u = getDueUrgency(t.dueDate, t.status)
      if (u === 'overdue') overdue++
      if (u === 'today') dueToday++
    }
    setOverdueTaskCount(overdue)
    setTodayTaskCount(dueToday)
    setInProgressTaskCount((data.inProgress as { total?: number })?.total ?? 0)
    setCompletedMonthCount((data.doneMonth as { total?: number })?.total ?? 0)

    const timeItems = (data.time as { items?: { hours: number; billable: boolean }[] })?.items || []
    const hours = timeItems.reduce((s, e) => s + e.hours, 0)
    const billable = timeItems.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
    setWeekHours(hours)
    setWeekBillableHours(billable)

    const accounting = data.accounting as { data?: { income?: { totalGross?: number }; expense?: { totalGross?: number } } } | undefined
    setTotalRevenue(accounting?.data?.income?.totalGross ?? 0)
    setTotalExpenses(accounting?.data?.expense?.totalGross ?? 0)

    const members = (data.team as { items?: TeamMember[] })?.items || []
    setTeamMembers(Array.isArray(members) ? members : [])

    const monthRevenue = accounting?.data?.income?.totalGross ?? 0
    setStats([
      { label: 'Clienti Attivi', value: String((data.clients as { total?: number })?.total ?? 0), icon: Users, color: 'text-primary', href: '/crm?status=ACTIVE' },
      { label: 'Progetti in Corso', value: String((data.projects as { total?: number })?.total ?? 0), icon: FolderKanban, color: 'text-accent', href: '/projects?status=IN_PROGRESS' },
      { label: 'Preventivi Aperti', value: String((data.quotes as { total?: number })?.total ?? 0), icon: Receipt, color: 'text-[var(--color-warning)]', href: '/erp/quotes?status=SENT' },
      { label: 'Ore Questa Settimana', value: hours.toFixed(1) + 'h', icon: Clock, color: 'text-muted', href: '/time' },
      { label: 'Fatturato Mese', value: monthRevenue > 0 ? formatCurrency(monthRevenue) : 'N/D', icon: TrendingUp, color: 'text-accent', href: '/erp/reports' },
      { label: 'Ticket Aperti', value: String((data.tickets as { total?: number })?.total ?? 0), icon: AlertCircle, color: 'text-destructive', href: '/support' },
    ])
  }

  useEffect(() => {
    async function loadDashboard() {
      setFetchError(null)
      try {
        const res = await fetch('/api/dashboard/summary')
        if (!res.ok) throw new Error('fetch failed')
        processDashboardData(await res.json())
      } catch {
        setFetchError('Errore nel caricamento dei dati della dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/dashboard/summary')
      if (!res.ok) throw new Error('fetch failed')
      processDashboardData(await res.json())
    } catch {
      setFetchError('Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    }).then(() => setTasks(prev => prev.filter(t => t.id !== taskId)))
  }

  const handleTaskPostpone = (taskId: string, newDate: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: newDate }),
    }).then(() => setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, dueDate: newDate } : t
    )))
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
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

      <StatCarousel stats={stats} loading={loading} />
      <DashboardQuickActions />

      <ForYouSection
        tasks={tasks}
        onTaskComplete={handleTaskComplete}
        onTaskPostpone={handleTaskPostpone}
      />

      {/* ROW 1: TASK IN SCADENZA + RIEPILOGO OPERATIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        <TasksDeadlineCard tasks={tasks} />
        <OperativeSummaryCard
          overdue={overdueTaskCount}
          today={todayTaskCount}
          inProgress={inProgressTaskCount}
          completedMonth={completedMonthCount}
        />
      </div>

      {/* ROW 2: CHARTS - Tabbed on mobile, grid on desktop */}
      <div className="md:hidden mb-5">
        <Card className="overflow-hidden">
          <CardContent>
            <MobileChartTabs tabs={[
              { label: 'Fatturato', content: <RevenueChart /> },
              { label: 'Cash Flow', content: <CashFlowChart /> },
              { label: 'Pipeline', content: <PipelineFunnel /> },
            ]} />
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <BarChart3 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle>Fatturato Mensile</CardTitle>
                  <p className="text-[11px] text-muted mt-0.5">Ultimi 12 mesi</p>
                </div>
              </div>
            </div>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle>Cash Flow</CardTitle>
                  <p className="text-[11px] text-muted mt-0.5">Entrate vs Uscite</p>
                </div>
              </div>
            </div>
            <CashFlowChart />
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: FINANCIAL SUMMARY + PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        <FinancialSummaryCard
          income={totalRevenue}
          expenses={totalExpenses}
          onViewDetails={() => router.push('/erp/reports')}
        />
        <Card className="hidden md:block overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle>Pipeline Commerciale</CardTitle>
                  <p className="text-[11px] text-muted mt-0.5">Distribuzione clienti</p>
                </div>
              </div>
            </div>
            <PipelineFunnel />
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: TREND + TEAM ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        <Card className="overflow-hidden">
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle>Trend Attività</CardTitle>
                  <p className="text-[11px] text-muted mt-0.5">Ultime 4 settimane</p>
                </div>
              </div>
            </div>
            <ActivityTrendChart height={260} />
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

      {/* ROW 5: ACTIVITY TIMELINE + STICKY NOTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
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
        <StickyNotesCard />
      </div>

    </div>
    </PullToRefresh>
  )
}
