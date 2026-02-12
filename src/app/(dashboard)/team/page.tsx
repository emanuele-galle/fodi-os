'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Mail, Phone, CheckCircle2, Clock, Calendar, Video } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarketingDashboard } from '@/components/ui/dashboard-1'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface WorkspaceMembership {
  workspace: { id: string; name: string; color: string }
  role: string
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl: string | null
  phone: string | null
  lastLoginAt: string | null
  workspaceMembers: WorkspaceMembership[]
  totalTasks: number
  totalTimeEntries: number
}

const ROLE_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  ADMIN: 'destructive',
  MANAGER: 'warning',
  SALES: 'success',
  PM: 'default',
  DEVELOPER: 'default',
  CONTENT: 'outline',
  SUPPORT: 'outline',
  CLIENT: 'outline',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
  PM: 'Project Manager',
  DEVELOPER: 'Developer',
  CONTENT: 'Content',
  SUPPORT: 'Support',
  CLIENT: 'Cliente',
}

const ROLE_OPTIONS = [
  { value: '', label: 'Tutti i ruoli' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PM', label: 'Project Manager' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'CONTENT', label: 'Content' },
  { value: 'SUPPORT', label: 'Support' },
]

function getActivityStatus(lastLoginAt: string | null): { label: string; color: string } {
  if (!lastLoginAt) return { label: 'Mai connesso', color: '#94A3B8' }
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 1) return { label: 'Online', color: '#22C55E' }
  if (hours < 24) return { label: 'Oggi', color: '#3B82F6' }
  if (hours < 72) return { label: 'Recente', color: '#F59E0B' }
  return { label: 'Inattivo', color: '#94A3B8' }
}

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [workspaces, setWorkspaces] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [meetingMemberId, setMeetingMemberId] = useState<string | null>(null)

  const teamSummary = useMemo(() => {
    const totalTasks = members.reduce((s, m) => s + m.totalTasks, 0)
    const totalTime = members.reduce((s, m) => s + m.totalTimeEntries, 0)
    const activeCount = members.filter((m) => {
      if (!m.lastLoginAt) return false
      return Date.now() - new Date(m.lastLoginAt).getTime() < 72 * 60 * 60 * 1000
    }).length
    const activePercent = members.length ? Math.round((activeCount / members.length) * 100) : 0
    const taskPercent = Math.min(100, members.length ? Math.round((totalTasks / Math.max(totalTasks + totalTime, 1)) * 100) : 0)
    return { totalTime, totalTasks, activePercent, taskPercent, activeCount }
  }, [members])

  useEffect(() => {
    async function loadTeam() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (workspaceFilter) params.set('workspace', workspaceFilter)
        const res = await fetch(`/api/team?${params}`)
        if (res.ok) {
          const data = await res.json()
          const items: TeamMember[] = data.items || []
          setMembers(items)

          const wsMap = new Map<string, string>()
          items.forEach((m) =>
            m.workspaceMembers.forEach((wm) => wsMap.set(wm.workspace.id, wm.workspace.name))
          )
          setWorkspaces([
            { value: '', label: 'Tutti i workspace' },
            ...Array.from(wsMap.entries()).map(([id, name]) => ({ value: id, label: name })),
          ])
        }
      } finally {
        setLoading(false)
      }
    }
    loadTeam()
  }, [workspaceFilter])

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleMeetWithMember(member: TeamMember) {
    if (meetingMemberId) return
    setMeetingMemberId(member.id)
    try {
      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Meet con ${member.firstName} ${member.lastName}`,
          attendeeEmails: [member.email],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        window.open(data.meetLink, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setMeetingMemberId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted mt-1">{filtered.length} membri</p>
        </div>
      </div>

      {!loading && members.length > 0 && (
        <div className="mb-8 flex justify-center">
          <MarketingDashboard
            title="Team Overview"
            className="w-full max-w-full"
            teamActivities={{
              totalHours: teamSummary.totalTime,
              stats: [
                { label: 'Attivi', value: teamSummary.activePercent, color: 'bg-green-400' },
                { label: 'Task', value: teamSummary.taskPercent, color: 'bg-blue-400' },
                { label: 'Altro', value: Math.max(0, 100 - teamSummary.activePercent - teamSummary.taskPercent), color: 'bg-muted' },
              ],
            }}
            team={{
              memberCount: members.length,
              members: members.slice(0, 5).map((m) => ({
                id: m.id,
                name: `${m.firstName} ${m.lastName}`,
                avatarUrl: m.avatarUrl || '',
              })),
            }}
            cta={{
              text: `${teamSummary.totalTasks} task assegnati al team`,
              buttonText: 'Vedi Task',
              onButtonClick: () => router.push('/tasks'),
            }}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        {workspaces.length > 1 && (
          <Select
            options={workspaces}
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="w-full sm:w-56"
          />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun membro trovato"
          description={search || workspaceFilter || roleFilter ? 'Prova a modificare i filtri di ricerca.' : 'Nessun membro del team registrato.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
          {filtered.map((member) => {
            const activity = getActivityStatus(member.lastLoginAt)
            return (
              <Card key={member.id} className="shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200">
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar
                        src={member.avatarUrl}
                        name={`${member.firstName} ${member.lastName}`}
                        size="lg"
                      />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card"
                        style={{ backgroundColor: activity.color }}
                        title={activity.label}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {member.firstName} {member.lastName}
                      </h3>
                      <Badge variant={ROLE_BADGE[member.role] || 'default'} className="mt-1">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {member.lastLoginAt
                          ? `Ultimo accesso ${formatDistanceToNow(new Date(member.lastLoginAt), { locale: it, addSuffix: true })}`
                          : 'Mai connesso'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{member.totalTasks} task</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{member.totalTimeEntries} registrazioni</span>
                    </div>
                    <button
                      onClick={() => handleMeetWithMember(member)}
                      disabled={meetingMemberId === member.id}
                      className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 md:px-2 md:py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50 touch-manipulation min-h-[44px] md:min-h-0"
                      title={`Avvia Meet con ${member.firstName}`}
                    >
                      <Video className="h-3.5 w-3.5 md:h-3 md:w-3" />
                      Meet
                    </button>
                  </div>

                  {member.workspaceMembers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.workspaceMembers.map((wm) => (
                        <span
                          key={wm.workspace.id}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-foreground"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: wm.workspace.color }}
                          />
                          {wm.workspace.name}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
