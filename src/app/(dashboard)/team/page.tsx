'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Mail, Phone, CheckCircle2, Clock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [workspaces, setWorkspaces] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState('')

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

          // Extract unique workspaces for filter
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

  const filtered = search
    ? members.filter(
        (m) =>
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <span className="text-sm text-muted">{filtered.length} membri</span>
      </div>

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
          description={search || workspaceFilter ? 'Prova a modificare i filtri di ricerca.' : 'Nessun membro del team registrato.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
          {filtered.map((member) => (
            <Card key={member.id}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar
                    src={member.avatarUrl}
                    name={`${member.firstName} ${member.lastName}`}
                    size="lg"
                  />
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
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{member.totalTasks} task</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{member.totalTimeEntries} registrazioni</span>
                  </div>
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
          ))}
        </div>
      )}
    </div>
  )
}
