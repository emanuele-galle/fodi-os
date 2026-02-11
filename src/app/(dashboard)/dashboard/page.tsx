'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, FolderKanban, Receipt, Clock, TrendingUp, AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

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

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<StatCard[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

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
          { label: 'Clienti Attivi', value: String(clientsRes?.total ?? 0), icon: Users, color: 'text-blue-500', href: '/crm?status=ACTIVE' },
          { label: 'Progetti in Corso', value: String(projectsRes?.total ?? 0), icon: FolderKanban, color: 'text-green-500', href: '/projects?status=IN_PROGRESS' },
          { label: 'Preventivi Aperti', value: String(quotesRes?.total ?? 0), icon: Receipt, color: 'text-amber-500', href: '/erp/quotes?status=SENT' },
          { label: 'Ore Questa Settimana', value: weekHours.toFixed(1) + 'h', icon: Clock, color: 'text-purple-500', href: '/time' },
          { label: 'Revenue MTD', value: formatCurrency(revenueMTD), icon: TrendingUp, color: 'text-emerald-500', href: '/erp/reports' },
          { label: 'Ticket Aperti', value: '—', icon: AlertCircle, color: 'text-red-500', href: '/support' },
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
  }, [])

  const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
    LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(stat.href)}
            >
              <CardContent className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-secondary ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Task in Scadenza</CardTitle>
              <button
                onClick={() => router.push('/projects')}
                className="text-sm text-primary hover:underline"
              >
                Vedi tutti
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted py-4">Nessun task in scadenza.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.project && (
                        <p className="text-xs text-muted">{task.project.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-[10px]">
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-muted">
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

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Attivita Recenti</CardTitle>
            </div>
            <p className="text-sm text-muted py-4">Timeline attivita in costruzione.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
