'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Users, TrendingUp, Clock, Loader2 } from 'lucide-react'

interface OverviewData {
  totalCourses: number
  totalLessons: number
  totalEnrollments: number
  completionRate: number
  averageTimeSpentSecs: number
  activeUsersLast30Days: number
}

function formatTime(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`
}

export function AnalyticsOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch_data() {
      try {
        const res = await fetch('/api/training/analytics/overview', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          setData(json.data)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetch_data()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-sm text-muted">
        Impossibile caricare le statistiche
      </div>
    )
  }

  const stats = [
    {
      label: 'Total Corsi',
      value: data.totalCourses.toString(),
      sub: `${data.totalLessons} lezioni`,
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Iscrizioni',
      value: data.totalEnrollments.toString(),
      sub: `${data.activeUsersLast30Days} attivi (30gg)`,
      icon: Users,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Completion Rate',
      value: `${data.completionRate}%`,
      sub: 'corsi completati',
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Tempo Medio',
      value: formatTime(data.averageTimeSpentSecs),
      sub: 'per lezione',
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Panoramica Formazione</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/40 bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Simple bar chart placeholder */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Distribuzione Completamento</h3>
        <div className="space-y-3">
          {[
            { label: 'Completati', pct: data.completionRate, color: 'bg-emerald-500' },
            { label: 'In Corso', pct: Math.max(0, 100 - data.completionRate), color: 'bg-blue-500' },
          ].map((bar) => (
            <div key={bar.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{bar.label}</span>
                <span className="font-medium text-foreground">{bar.pct.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar.color} transition-all duration-500`}
                  style={{ width: `${Math.max(bar.pct, 1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity summary */}
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Riepilogo Attivita</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-foreground">{data.totalCourses}</p>
            <p className="text-xs text-muted">Corsi</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-foreground">{data.totalLessons}</p>
            <p className="text-xs text-muted">Lezioni</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <p className="text-xl font-bold text-foreground">{data.activeUsersLast30Days}</p>
            <p className="text-xs text-muted">Utenti Attivi</p>
          </div>
        </div>
      </div>
    </div>
  )
}
