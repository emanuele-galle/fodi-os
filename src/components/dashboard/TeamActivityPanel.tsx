'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop, react-perf/jsx-no-new-object-as-prop -- handlers + dynamic styles */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Activity, Users, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { ChartContainer } from '@/components/ui/ChartContainer'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { useSSE } from '@/hooks/useSSE'
import { useRouter } from 'next/navigation'

type Period = 'daily' | 'weekly' | 'monthly'

interface TrendPoint {
  label: string
  value: number
}

interface MemberData {
  id: string
  name: string
  avatarUrl: string | null
  activityCount: number
  isOnline: boolean
  lastAction: { action: string; entityType: string; entityId: string; timestamp: string } | null
  currentTask: { id: string; title: string; status: string; projectName: string } | null
}

interface TeamActivityResponse {
  trend: TrendPoint[]
  members: MemberData[]
  totalActivities: number
}

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Giorno' },
  { key: 'weekly', label: 'Settimana' },
  { key: 'monthly', label: 'Mese' },
]

const ACTION_LABELS: Record<string, string> = {
  create: 'Creazione',
  update: 'Aggiornamento',
  complete: 'Completamento',
  delete: 'Eliminazione',
  AUTO_TIME_LOG: 'Registro ore',
  TIMER_STOP: 'Timer',
}

const PERIOD_SUBTITLE: Record<Period, string> = {
  daily: 'Ultimi 30 giorni',
  weekly: 'Ultime 12 settimane',
  monthly: 'Ultimi 12 mesi',
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold">{payload[0].value} attività</p>
    </div>
  )
}

export function TeamActivityPanel() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('daily')
  const [data, setData] = useState<TeamActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/team-activity?period=${period}`)
      if (!res.ok) return
      const json: TeamActivityResponse = await res.json()
      setData(json)
      setOnlineUsers(new Set(json.members.filter(m => m.isOnline).map(m => m.id)))
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  // Refresh on activity changes
  useRealtimeRefresh('task', fetchData)

  // Track presence changes via SSE
  useSSE(
    useCallback((event) => {
      if (event.type === 'presence') {
        const { userId, status } = event.data as { userId: string; status: string }
        setOnlineUsers(prev => {
          const next = new Set(prev)
          if (status === 'online') next.add(userId)
          else next.delete(userId)
          return next
        })
      }
    }, [])
  )

  const activeMembers = useMemo(
    () => data?.members.filter(m => m.activityCount > 0).length ?? 0,
    [data]
  )

  const maxActivity = useMemo(
    () => data?.members.reduce((max, m) => Math.max(max, m.activityCount), 0) ?? 1,
    [data]
  )

  const chartColor = 'var(--color-primary)'

  if (loading && !data) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle>Attività Team</CardTitle>
              <p className="text-xs text-muted mt-0.5">
                {data.totalActivities} attività · {activeMembers} membr{activeMembers === 1 ? 'o' : 'i'} attiv{activeMembers === 1 ? 'o' : 'i'}
              </p>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary/60">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  period === opt.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] text-muted mb-3">{PERIOD_SUBTITLE[period]}</p>

        {/* Chart */}
        <ChartContainer className="h-[180px] md:h-[200px] lg:h-[220px] mb-6">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="teamTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.28} />
                  <stop offset="50%" stopColor={chartColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                stroke="transparent"
                tickLine={false}
                axisLine={false}
                interval={period === 'daily' ? 4 : 0}
              />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted)' }} stroke="transparent" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: chartColor, strokeDasharray: '4 4', strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                fill="url(#teamTrendGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: chartColor, stroke: 'var(--color-card)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Members section */}
        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted" />
              <span className="text-xs font-medium text-muted">Membri del Team</span>
            </div>
            <button
              onClick={() => router.push('/team')}
              className="text-xs font-medium text-primary hover:text-primary/80 px-2.5 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1"
            >
              Team <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {data.members.map(member => {
              const isOnline = onlineUsers.has(member.id)
              const barWidth = maxActivity > 0 ? (member.activityCount / maxActivity) * 100 : 0

              return (
                <div key={member.id} className="group">
                  <div className="flex items-center gap-3">
                    {/* Avatar + online indicator */}
                    <div className="relative flex-shrink-0">
                      <Avatar name={member.name} src={member.avatarUrl || undefined} size="sm" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                          isOnline ? 'bg-green-500' : 'bg-zinc-400'
                        }`}
                      />
                    </div>

                    {/* Name + count + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{member.name}</span>
                        <span className="text-xs text-muted tabular-nums ml-2 flex-shrink-0">
                          {member.activityCount} attività
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Current task */}
                  {member.currentTask ? (
                    <div className="ml-11 mt-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-[11px] text-muted truncate">
                        {member.currentTask.title}
                        {member.currentTask.projectName && (
                          <span className="text-muted/60"> · {member.currentTask.projectName}</span>
                        )}
                      </span>
                    </div>
                  ) : member.lastAction ? (
                    <div className="ml-11 mt-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                      <span className="text-[11px] text-muted/60 truncate">
                        {ACTION_LABELS[member.lastAction.action] || member.lastAction.action} · {member.lastAction.entityType}
                      </span>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {data.members.length === 0 && (
              <p className="text-xs text-muted text-center py-4">Nessun membro del team</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
