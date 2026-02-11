'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, FolderKanban, Users, CheckSquare, BookOpen, Settings,
  ArrowRight, Clock, ListChecks,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'

interface Project {
  id: string
  name: string
  status: string
  priority: string
  _count?: { tasks: number }
  completedTasks?: number
  members?: { user: { id: string; firstName: string; lastName: string; avatar?: string | null } }[]
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
  { label: 'Progetti', href: '/projects', icon: FolderKanban, color: 'text-[var(--color-warning)]' },
  { label: 'Task', href: '/tasks', icon: CheckSquare, color: 'text-emerald-600' },
  { label: 'Calendario', href: '/calendar', icon: Clock, color: 'text-purple-600' },
]

export default function InternalPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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
        else if (Array.isArray(userRes)) setUsers(userRes)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING' || p.status === 'REVIEW')
  const openTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
  const totalTasks = projects.reduce((s, p) => s + (p._count?.tasks ?? 0), 0)
  const completedTasks = projects.reduce((s, p) => s + (p.completedTasks ?? 0), 0)

  const stats = [
    { label: 'Progetti Attivi', value: String(activeProjects.length), icon: FolderKanban, color: 'text-primary' },
    { label: 'Task Aperti', value: String(openTasks.length), icon: CheckSquare, color: 'text-accent' },
    { label: 'Completamento', value: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%', icon: ListChecks, color: 'text-emerald-600' },
    { label: 'Membri Team', value: String(users.length), icon: Users, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Azienda</h1>
          <p className="text-sm text-muted">Gestione interna e operazioni FODI</p>
        </div>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-stagger">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-lift glow-gold accent-line-top">
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
          {projects.length === 0 ? (
            <Card className="glass-card">
              <CardContent>
                <p className="text-sm text-muted py-4 text-center">Nessun progetto interno trovato.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
              {projects.map((p) => {
                const totalT = p._count?.tasks ?? 0
                const doneT = p.completedTasks ?? 0
                return (
                  <Card
                    key={p.id}
                    className="glass-card cursor-pointer overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] hover:scale-[1.01] transition-all duration-200 touch-manipulation active:scale-[0.98]"
                    onClick={() => router.push(`/projects/${p.id}`)}
                    style={{ borderTop: `3px solid ${STATUS_COLORS[p.status] || 'var(--color-primary)'}` }}
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
                          {p.priority}
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
                                background: 'var(--gold-gradient)',
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
              })}
            </div>
          )}
        </div>
      )}

      {/* Task Recenti */}
      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="accent-line-top shadow-lift">
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
              <p className="text-sm text-muted py-4">Nessun task trovato.</p>
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
    </div>
  )
}
