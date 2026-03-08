'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- handlers + dynamic styles */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { useRouter } from 'next/navigation'
import {
  Users, FolderKanban, TrendingUp, AlertCircle,
  Activity, UserPlus, FileText, CheckCircle2, TicketCheck,
  BarChart3, Wallet,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { getDueUrgency } from '@/lib/task-utils'
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard'
import { TeamActivityCard } from '@/components/dashboard/TeamActivityCard'
const TeamActivityPanel = dynamic(() => import('@/components/dashboard/TeamActivityPanel').then(m => ({ default: m.TeamActivityPanel })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-56 lg:h-64 w-full rounded-lg" />,
})
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { MobileChartTabs } from '@/components/dashboard/MobileChartTabs'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { StatCarousel } from '@/components/dashboard/StatCarousel'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import { ForYouSection } from '@/components/dashboard/ForYouSection'
import { TasksDeadlineCard } from '@/components/dashboard/TasksDeadlineCard'
import { OperativeSummaryCard } from '@/components/dashboard/OperativeSummaryCard'
import { StickyNotesCard } from '@/components/dashboard/StickyNotesCard'
import { useCurrentUser } from '@/providers/UserProvider'
import {
  getProfileConfig, getProfileGreeting,
  STAT_DEFINITIONS, QUICK_ACTION_DEFINITIONS,
  type StatKey,
} from '@/lib/dashboard-profiles'

const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart').then(m => ({ default: m.RevenueChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-56 lg:h-64 w-full rounded-lg" />,
})
const CashFlowChart = dynamic(() => import('@/components/dashboard/CashFlowChart').then(m => ({ default: m.CashFlowChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-56 lg:h-64 w-full rounded-lg" />,
})
const PipelineFunnel = dynamic(() => import('@/components/dashboard/PipelineFunnel').then(m => ({ default: m.PipelineFunnel })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-56 lg:h-64 w-full rounded-lg" />,
})
const ActivityTrendChart = dynamic(() => import('@/components/dashboard/ActivityTrendChart').then(m => ({ default: m.ActivityTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] md:h-56 lg:h-64 w-full rounded-lg" />,
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

interface ProcessedDashboardData {
  tasks: TaskItem[]
  activities: ActivityItem[]
  overdue: number
  dueToday: number
  inProgress: number
  completedMonth: number
  weekHours: number
  weekBillableHours: number
  totalRevenue: number
  totalExpenses: number
  teamMembers: TeamMember[]
}

function processDashboardResponse(data: Record<string, unknown>): ProcessedDashboardData {
  const tasks: TaskItem[] = (data.tasks as { items?: TaskItem[] })?.items || []
  const activities: ActivityItem[] = (data.activity as { items?: ActivityItem[] })?.items || []

  let overdue = 0, dueToday = 0
  for (const t of tasks) {
    const u = getDueUrgency(t.dueDate, t.status)
    if (u === 'overdue') overdue++
    if (u === 'today') dueToday++
  }

  const timeItems = (data.time as { items?: { hours: number; billable: boolean }[] })?.items || []
  const weekHours = Math.round(timeItems.reduce((s, e) => s + e.hours, 0) * 10) / 10
  const weekBillableHours = Math.round(timeItems.filter(e => e.billable).reduce((s, e) => s + e.hours, 0) * 10) / 10

  const accounting = data.accounting as { data?: { income?: { totalGross?: number }; expense?: { totalGross?: number } } } | undefined
  const members = (data.team as { items?: TeamMember[] })?.items || []

  return {
    tasks,
    activities,
    overdue,
    dueToday,
    inProgress: (data.inProgress as { total?: number })?.total ?? 0,
    completedMonth: (data.doneMonth as { total?: number })?.total ?? 0,
    weekHours,
    weekBillableHours,
    totalRevenue: accounting?.data?.income?.totalGross ?? 0,
    totalExpenses: accounting?.data?.expense?.totalGross ?? 0,
    teamMembers: Array.isArray(members) ? members : [],
  }
}

function mapActivitiesToTimeline(activities: ActivityItem[]) {
  return activities.map((activity) => {
    const ActionIcon = ACTIVITY_ICONS[activity.entityType] || Activity
    return {
      id: activity.id,
      icon: ActionIcon,
      message: (
        <>
          <span className="font-semibold text-foreground">{activity.user.firstName} {activity.user.lastName}</span>
          {' '}{getActivityLabel(activity)}
        </>
      ),
      timestamp: formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: it }),
      iconColorClass: ICON_COLORS[activity.entityType] || 'text-muted bg-secondary',
    }
  })
}

function DashboardHeader({ userName, subtitle }: { userName: string; subtitle: string }) {
  return (
    <div className="mb-5 md:mb-6 lg:mb-8">
      <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight leading-tight">
        {getGreeting()}{userName && <>, {userName}</>}
      </h1>
      <p className="text-[13px] md:text-sm text-muted mt-0.5 md:mt-1 capitalize">{subtitle}</p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      <button onClick={() => window.location.reload()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
    </div>
  )
}

function updateTaskDate(tasks: TaskItem[], taskId: string, newDate: string): TaskItem[] {
  return tasks.map(t => t.id === taskId ? { ...t, dueDate: newDate } : t)
}

function buildStatValue(key: StatKey, data: Record<string, unknown>, hours: number, monthRevenue: number, taskItems: TaskItem[]): string {
  switch (key) {
    case 'clients': return String((data.clients as { total?: number })?.total ?? 0)
    case 'projects': return String((data.projects as { total?: number })?.total ?? 0)
    case 'quotes': return String((data.quotes as { total?: number })?.total ?? 0)
    case 'hours':
    case 'weekHours':
    case 'teamHours':
      return hours.toFixed(1) + 'h'
    case 'revenue': return monthRevenue > 0 ? formatCurrency(monthRevenue) : 'N/D'
    case 'tickets': return String((data.tickets as { total?: number })?.total ?? 0)
    case 'myTasks': return String(taskItems.length)
    case 'deadlines': {
      let deadlineCount = 0
      for (const t of taskItems) {
        const u = getDueUrgency(t.dueDate, t.status)
        if (u === 'overdue' || u === 'today' || u === 'tomorrow') deadlineCount++
      }
      return String(deadlineCount)
    }
    case 'completedMonth':
    case 'tasksDone':
      return String((data.doneMonth as { total?: number })?.total ?? 0)
    case 'avgResponseTime': return (data.avgResponseTime as string) ?? 'N/D'
    case 'resolvedTickets': return String((data.resolvedTickets as { total?: number })?.total ?? 0)
    case 'documents': return String((data.documents as { total?: number })?.total ?? 0)
    default: return '0'
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const role = currentUser?.role ?? 'DEVELOPER'
  const profileConfig = useMemo(() => getProfileConfig(role), [role])
  const profileGreeting = useMemo(() => getProfileGreeting(role), [role])

  const [stats, setStats] = useState<StatCard[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
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

  const quickActions = useMemo(() =>
    profileConfig.quickActions.map(key => QUICK_ACTION_DEFINITIONS[key]),
    [profileConfig.quickActions]
  )

  const applyDashboardData = useCallback((data: Record<string, unknown>) => {
    const d = processDashboardResponse(data)
    setTasks(d.tasks)
    setActivities(d.activities)
    setOverdueTaskCount(d.overdue)
    setTodayTaskCount(d.dueToday)
    setInProgressTaskCount(d.inProgress)
    setCompletedMonthCount(d.completedMonth)
    setWeekHours(d.weekHours)
    setWeekBillableHours(d.weekBillableHours)
    setTotalRevenue(d.totalRevenue)
    setTotalExpenses(d.totalExpenses)
    setTeamMembers(d.teamMembers)

    setStats(
      profileConfig.stats.map(key => {
        const def = STAT_DEFINITIONS[key]
        return {
          label: def.label,
          value: buildStatValue(key, data, d.weekHours, d.totalRevenue, d.tasks),
          icon: def.icon,
          color: def.color,
          href: def.href,
        }
      })
    )
  }, [profileConfig])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/dashboard/summary?role=${role}`)
      if (!res.ok) throw new Error('fetch failed')
      applyDashboardData(await res.json())
    } catch {
      setFetchError('Errore nel caricamento dei dati della dashboard')
    } finally {
      setLoading(false)
    }
  }, [role, applyDashboardData])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  useRealtimeRefresh('client', fetchDashboard)
  useRealtimeRefresh('expense', fetchDashboard)
  useRealtimeRefresh('income', fetchDashboard)
  useRealtimeRefresh('task', fetchDashboard)
  useRealtimeRefresh('project', fetchDashboard)
  useRealtimeRefresh('deal', fetchDashboard)

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
    }).then(() => setTasks(prev => updateTaskDate(prev, taskId, newDate)))
  }

  // Pre-compute all visibility flags to reduce JSX complexity
  const w = useMemo(() => {
    const widgets = profileConfig.widgets
    const charts = profileConfig.charts
    return {
      forYou: widgets.includes('forYou'),
      deadline: widgets.includes('tasksDeadline'),
      operative: widgets.includes('operative'),
      financial: widgets.includes('financial'),
      pipeline: widgets.includes('pipeline'),
      teamActivity: widgets.includes('teamActivity'),
      teamPanel: widgets.includes('teamPanel'),
      timeline: widgets.includes('activityTimeline'),
      notes: widgets.includes('stickyNotes'),
      revenue: charts.includes('revenue'),
      cashFlow: charts.includes('cashFlow'),
      pipelineFunnel: charts.includes('pipelineFunnel'),
      activityTrend: charts.includes('activityTrend'),
    }
  }, [profileConfig])

  const showDesktopCharts = w.revenue || w.cashFlow

  // Pre-compute adaptive grid classes
  const row1Grid = w.deadline && w.operative ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6' : 'grid grid-cols-1 gap-3 md:gap-4 mb-5 md:mb-6'
  const chartsGrid = w.revenue && w.cashFlow ? 'hidden md:grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6' : 'hidden md:grid grid-cols-1 gap-4 mb-6'
  const row3Grid = w.financial && w.pipeline && w.pipelineFunnel ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6' : 'grid grid-cols-1 gap-3 md:gap-4 mb-5 md:mb-6'
  const row4Grid = w.activityTrend && w.teamActivity ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6' : 'grid grid-cols-1 gap-3 md:gap-4 mb-5 md:mb-6'
  const row5Grid = w.timeline && w.notes ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6' : 'grid grid-cols-1 gap-3 md:gap-4 mb-5 md:mb-6'

  const mobileChartTabs = useMemo(() => {
    const tabs: { label: string; content: React.ReactNode }[] = []
    if (w.revenue) tabs.push({ label: 'Fatturato', content: <RevenueChart /> })
    if (w.cashFlow) tabs.push({ label: 'Cash Flow', content: <CashFlowChart /> })
    if (w.pipelineFunnel) tabs.push({ label: 'Pipeline', content: <PipelineFunnel /> })
    return tabs
  }, [w.revenue, w.cashFlow, w.pipelineFunnel])

  const mappedActivities = useMemo(() => mapActivitiesToTimeline(activities), [activities])

  const userName = currentUser?.firstName ?? ''

  const teamBreakdown = useMemo(() => {
    if (weekHours <= 0) return [
      { label: 'Fatturabili', value: 0, color: 'bg-primary' },
      { label: 'Non fatt.', value: 0, color: 'bg-amber-400' },
    ]
    return [
      { label: 'Fatturabili', value: Math.round((weekBillableHours / weekHours) * 100), color: 'bg-primary' },
      { label: 'Non fatt.', value: Math.round(((weekHours - weekBillableHours) / weekHours) * 100), color: 'bg-amber-400' },
    ]
  }, [weekHours, weekBillableHours])

  const teamMembersList = useMemo(() =>
    teamMembers.length > 0
      ? teamMembers.map((m) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, avatarUrl: m.avatarUrl || undefined }))
      : [{ id: '1', name: userName || 'Team', avatarUrl: undefined }],
    [teamMembers, userName]
  )

  return (
    <PullToRefresh onRefresh={fetchDashboard}>
    <div>
      {/* HEADER */}
      <DashboardHeader userName={userName} subtitle={`${profileGreeting} \u00B7 ${formatTodayDate()}`} />

      <ErrorBanner message={fetchError} />

      <StatCarousel stats={stats} loading={loading} />
      <DashboardQuickActions actions={quickActions} />

      {w.forYou && (
        <ForYouSection
          tasks={tasks}
          onTaskComplete={handleTaskComplete}
          onTaskPostpone={handleTaskPostpone}
        />
      )}

      {/* ROW 1: TASK IN SCADENZA + RIEPILOGO OPERATIVO */}
      {(w.deadline || w.operative) && (
        <div className={row1Grid}>
          {w.deadline && <TasksDeadlineCard tasks={tasks} fullWidth={!w.operative} />}
          {w.operative && (
            <OperativeSummaryCard
              overdue={overdueTaskCount}
              today={todayTaskCount}
              inProgress={inProgressTaskCount}
              completedMonth={completedMonthCount}
            />
          )}
        </div>
      )}

      {/* ROW 2: CHARTS - Tabbed on mobile, grid on desktop */}
      {mobileChartTabs.length > 0 && (
        <div className="md:hidden mb-5">
          <Card className="overflow-hidden">
            <CardContent>
              <MobileChartTabs tabs={mobileChartTabs} />
            </CardContent>
          </Card>
        </div>
      )}

      {showDesktopCharts && (
        <div className={chartsGrid}>
          {w.revenue && (
            <Card className="overflow-hidden">
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                      <BarChart3 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle>Fatturato Mensile</CardTitle>
                      <p className="text-xs text-muted mt-0.5">Ultimi 12 mesi</p>
                    </div>
                  </div>
                </div>
                <RevenueChart />
              </CardContent>
            </Card>
          )}

          {w.cashFlow && (
            <Card className="overflow-hidden">
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                      <Wallet className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle>Cash Flow</CardTitle>
                      <p className="text-xs text-muted mt-0.5">Entrate vs Uscite</p>
                    </div>
                  </div>
                </div>
                <CashFlowChart />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ROW 3: FINANCIAL SUMMARY + PIPELINE */}
      {(w.financial || w.pipeline) && (
        <div className={row3Grid}>
          {w.financial && (
            <FinancialSummaryCard
              income={totalRevenue}
              expenses={totalExpenses}
              onViewDetails={() => router.push('/erp/reports')}
            />
          )}
          {w.pipeline && w.pipelineFunnel && (
            <Card className="overflow-hidden">
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                      <TrendingUp className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle>Pipeline Commerciale</CardTitle>
                      <p className="text-xs text-muted mt-0.5">Distribuzione clienti</p>
                    </div>
                  </div>
                </div>
                <PipelineFunnel />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ROW 4: TEAM ACTIVITY PANEL (unified trend + members) */}
      {w.teamPanel && (
        <div className="mb-5 md:mb-6">
          <TeamActivityPanel />
        </div>
      )}

      {/* ROW 4 LEGACY: TREND + TEAM ACTIVITY (for profiles that still use old widgets) */}
      {!w.teamPanel && (w.activityTrend || w.teamActivity) && (
        <div className={row4Grid}>
          {w.activityTrend && (
            <Card className="overflow-hidden">
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle>Trend Attività</CardTitle>
                      <p className="text-xs text-muted mt-0.5">Ultime 4 settimane</p>
                    </div>
                  </div>
                </div>
                <ActivityTrendChart height={260} />
              </CardContent>
            </Card>
          )}

          {w.teamActivity && (
            <TeamActivityCard
              totalHours={weekHours}
              breakdown={teamBreakdown}
              members={teamMembersList}
              onManageTeam={() => router.push('/team')}
            />
          )}
        </div>
      )}

      {/* ROW 5: ACTIVITY TIMELINE + STICKY NOTES */}
      {(w.timeline || w.notes) && (
        <div className={row5Grid}>
          {w.timeline && <ActivityTimeline activities={mappedActivities} />}
          {w.notes && <StickyNotesCard />}
        </div>
      )}

    </div>
    </PullToRefresh>
  )
}
