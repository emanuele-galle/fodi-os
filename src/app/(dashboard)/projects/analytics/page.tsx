'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, TrendingUp, AlertTriangle, Clock,
  BarChart3, PieChart as PieChartIcon, Users, Timer, AlertCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { TeamProductivityTable } from '@/components/dashboard/TeamProductivityTable'

const TaskCompletionChart = dynamic(() => import('@/components/dashboard/TaskCompletionChart').then(m => ({ default: m.TaskCompletionChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const TaskStatusChart = dynamic(() => import('@/components/dashboard/TaskStatusChart').then(m => ({ default: m.TaskStatusChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})
const HoursComparisonChart = dynamic(() => import('@/components/dashboard/HoursComparisonChart').then(m => ({ default: m.HoursComparisonChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

interface AnalyticsData {
  summary: {
    total: number
    completed: number
    inProgress: number
    overdue: number
    completionRate: number
    avgCompletionDays: number
  }
  byStatus: { status: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  byUser: { userId: string; userName: string; assigned: number; completed: number; overdue: number; hoursLogged: number }[]
  weeklyTrend: { week: string; completed: number; created: number }[]
  hoursComparison: { projectName: string; estimated: number; actual: number }[]
}

interface ProjectOption {
  id: string
  name: string
}

export default function ProjectsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectId, setProjectId] = useState('')
  const [userId, setUserId] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  // Carica lista progetti
  useEffect(() => {
    fetch('/api/projects?limit=100')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const items = d?.items || []
        setProjects(items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      })
      .catch(() => {})
  }, [])

  // Carica analytics
  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (userId) params.set('userId', userId)

      const res = await fetch(`/api/analytics/tasks?${params.toString()}`)
      if (!res.ok) {
        setFetchError('Errore nel caricamento delle analisi')
        return
      }
      const json: AnalyticsData = await res.json()
      setData(json)

      // Estrai utenti dalla risposta per il filtro
      if (json.byUser.length > 0 && users.length === 0) {
        setUsers(json.byUser.map((u) => ({ id: u.userId, name: u.userName })))
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle analisi')
    } finally {
      setLoading(false)
    }
  }, [projectId, userId, users.length])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Calcola velocity (completate per settimana, media ultime 4 settimane)
  const velocity = data
    ? (() => {
        const recent = data.weeklyTrend.slice(-4)
        const totalCompleted = recent.reduce((s, w) => s + w.completed, 0)
        return recent.length > 0 ? Math.round((totalCompleted / recent.length) * 10) / 10 : 0
      })()
    : 0

  const overdueRate = data && data.summary.total > 0
    ? Math.round((data.summary.overdue / data.summary.total) * 100)
    : 0

  return (
    <div className="animate-fade-in">
      {/* HEADER */}
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-3 md:gap-4 mb-1">
          <div className="p-2.5 md:p-3 rounded-lg bg-accent/10 text-accent">
            <BarChart3 className="h-6 w-6 md:h-7 md:w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Analisi Task
            </h1>
            <p className="text-xs md:text-sm text-muted mt-1">Panoramica produttività e avanzamento task</p>
          </div>
        </div>
      </div>

      {/* FILTRI */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-48">
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            options={[
              { value: '', label: 'Tutti i progetti' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>
        <div className="w-48">
          <Select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={[
              { value: '', label: 'Tutti i membri' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => loadAnalytics()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 md:h-28 rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{data?.summary.completed ?? 0}</p>
                <p className="text-[10px] md:text-xs text-muted uppercase tracking-wider font-medium mt-1">Task Completate</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{velocity}</p>
                <p className="text-[10px] md:text-xs text-muted uppercase tracking-wider font-medium mt-1">Velocità / Settimana</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{overdueRate}%</p>
                <p className="text-[10px] md:text-xs text-muted uppercase tracking-wider font-medium mt-1">% Scaduti</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                    <Timer className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{data?.summary.avgCompletionDays ?? 0}g</p>
                <p className="text-[10px] md:text-xs text-muted uppercase tracking-wider font-medium mt-1">Tempo Medio Completamento</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ROW 1: COMPLETION TREND + STATUS DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle>Trend Completamento Task</CardTitle>
            </div>
            <TaskCompletionChart data={data?.weeklyTrend ?? []} loading={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <CardTitle>Distribuzione per Status</CardTitle>
            </div>
            <TaskStatusChart data={data?.byStatus ?? []} loading={loading} />
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: HOURS COMPARISON */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)', color: 'var(--color-warning)' }}>
                <Clock className="h-4 w-4" />
              </div>
              <CardTitle>Ore Stimate vs Effettive</CardTitle>
            </div>
            <HoursComparisonChart data={data?.hoursComparison ?? []} loading={loading} />
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: TEAM PRODUCTIVITY TABLE */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <CardTitle>Produttività Team</CardTitle>
            </div>
            <TeamProductivityTable data={data?.byUser ?? []} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
