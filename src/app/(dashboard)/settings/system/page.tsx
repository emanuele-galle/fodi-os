'use client'

import { useState, useEffect } from 'react'
import { Users, FolderKanban, Briefcase, Server, ShieldCheck, Clock } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface SystemStats {
  users: { total: number; active: number }
  clients: Record<string, number>
  projects: Record<string, number>
  recentLogins: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    avatarUrl: string | null
    lastLoginAt: string
  }[]
  app: { name: string; version: string; environment: string }
}

const CLIENT_STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  CHURNED: 'Perso',
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  IN_PROGRESS: 'In Corso',
  ON_HOLD: 'In Pausa',
  REVIEW: 'Revisione',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
  PM: 'PM',
  DEVELOPER: 'Dev',
  CONTENT: 'Content',
  SUPPORT: 'Support',
  CLIENT: 'Cliente',
}

export default function SystemStatsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/system/stats')
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Accesso non autorizzato' : 'Errore caricamento')
        return r.json()
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Sistema</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Sistema</h1>
        <Card>
          <CardContent>
            <p className="text-sm text-destructive">{error || 'Errore nel caricamento dei dati.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalClients = Object.values(stats.clients).reduce((s, v) => s + v, 0)
  const totalProjects = Object.values(stats.projects).reduce((s, v) => s + v, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sistema</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="hover:scale-[1.02] transition-all duration-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-secondary to-secondary/60 text-blue-500">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Utenti</p>
              <p className="text-2xl font-bold">{stats.users.active}</p>
              <p className="text-xs text-muted">{stats.users.total} totali, {stats.users.active} attivi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-all duration-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-secondary to-secondary/60 text-green-500">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Clienti</p>
              <p className="text-2xl font-bold">{totalClients}</p>
              <p className="text-xs text-muted">{stats.clients.ACTIVE || 0} attivi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] transition-all duration-200">
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-secondary to-secondary/60 text-purple-500">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Progetti</p>
              <p className="text-2xl font-bold">{totalProjects}</p>
              <p className="text-xs text-muted">{stats.projects.IN_PROGRESS || 0} in corso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clients by status */}
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Clienti per Stato</CardTitle>
            <div className="space-y-3">
              {Object.entries(stats.clients).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm">{CLIENT_STATUS_LABELS[status] || status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${totalClients > 0 ? (count / totalClients) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projects by status */}
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Progetti per Stato</CardTitle>
            <div className="space-y-3">
              {Object.entries(stats.projects).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm">{PROJECT_STATUS_LABELS[status] || status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${totalProjects > 0 ? (count / totalProjects) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent logins */}
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Ultimi Login</CardTitle>
            {stats.recentLogins.length === 0 ? (
              <p className="text-sm text-muted py-4">Nessun login recente.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentLogins.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Avatar
                      src={user.avatarUrl}
                      name={`${user.firstName} ${user.lastName}`}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <p className="text-[10px] text-muted mt-1">
                        {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Informazioni Sistema</CardTitle>
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 border-b border-border">
                <Server className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">Applicazione</span>
                <span className="text-sm font-medium ml-auto">{stats.app.name}</span>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-border">
                <ShieldCheck className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">Versione</span>
                <Badge variant="default" className="ml-auto">v{stats.app.version}</Badge>
              </div>
              <div className="flex items-center gap-3 py-2 border-b border-border">
                <Clock className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">Ambiente</span>
                <Badge variant={stats.app.environment === 'production' ? 'success' : 'warning'} className="ml-auto">
                  {stats.app.environment}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
