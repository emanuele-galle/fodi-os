'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Mail, Phone, CheckCircle2, Clock, Calendar, Video, ChevronDown, ChevronUp, Plus, ListTodo } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { TeamActivityCard } from '@/components/dashboard/TeamActivityCard'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface WorkspaceMembership {
  workspace: { id: string; name: string; color: string }
  role: string
}

interface ActiveTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
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
  weeklyHours: number
  completedThisWeek: number
  activeTasks: ActiveTask[]
}

interface SearchTask {
  id: string
  title: string
  status: string
  priority: string
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

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completata',
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

function formatHoursMinutes(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return '0h'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

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
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  // Assign task modal
  const [assignModalMember, setAssignModalMember] = useState<TeamMember | null>(null)
  const [taskSearch, setTaskSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchTask[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const teamSummary = useMemo(() => {
    const totalTasks = members.reduce((s, m) => s + m.totalTasks, 0)
    const totalTime = members.reduce((s, m) => s + m.totalTimeEntries, 0)
    const totalWeeklyHours = members.reduce((s, m) => s + m.weeklyHours, 0)
    const totalCompletedWeek = members.reduce((s, m) => s + m.completedThisWeek, 0)
    const activeCount = members.filter((m) => {
      if (!m.lastLoginAt) return false
      return Date.now() - new Date(m.lastLoginAt).getTime() < 72 * 60 * 60 * 1000
    }).length
    const activePercent = members.length ? Math.round((activeCount / members.length) * 100) : 0
    const taskPercent = Math.min(100, members.length ? Math.round((totalTasks / Math.max(totalTasks + totalTime, 1)) * 100) : 0)
    return { totalTime, totalTasks, activePercent, taskPercent, activeCount, totalWeeklyHours, totalCompletedWeek }
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
            m.workspaceMembers?.forEach((wm) => wsMap.set(wm.workspace.id, wm.workspace.name))
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

  // Search tasks for assign modal
  useEffect(() => {
    if (!taskSearch.trim() || !assignModalMember) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/tasks?search=${encodeURIComponent(taskSearch)}&limit=10&status=TODO,IN_PROGRESS`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.items || [])
        }
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [taskSearch, assignModalMember])

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
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

  async function handleAssignTask(taskId: string) {
    if (!assignModalMember || assigning) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add: [assignModalMember.id] }),
      })
      if (res.ok) {
        setAssignModalMember(null)
        setTaskSearch('')
        // Refresh team data
        const teamRes = await fetch(`/api/team?${workspaceFilter ? `workspace=${workspaceFilter}` : ''}`)
        if (teamRes.ok) {
          const data = await teamRes.json()
          setMembers(data.items || [])
        }
      }
    } finally {
      setAssigning(false)
    }
  }

  async function handleCreateAndAssignTask() {
    if (!assignModalMember || !newTaskTitle.trim() || assigning) return
    setAssigning(true)
    try {
      // Create the task
      const createRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          assigneeId: assignModalMember.id,
          assigneeIds: [assignModalMember.id],
        }),
      })
      if (createRes.ok) {
        setAssignModalMember(null)
        setNewTaskTitle('')
        setTaskSearch('')
        // Refresh
        const teamRes = await fetch(`/api/team?${workspaceFilter ? `workspace=${workspaceFilter}` : ''}`)
        if (teamRes.ok) {
          const data = await teamRes.json()
          setMembers(data.items || [])
        }
      }
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Team</h1>
            <p className="text-xs md:text-sm text-muted">{filtered.length} membri</p>
          </div>
        </div>
      </div>

      {!loading && members.length > 0 && (
        <div className="mb-8">
          <TeamActivityCard
            totalHours={teamSummary.totalTime}
            breakdown={[
              { label: 'Attivi', value: teamSummary.activePercent, color: 'bg-emerald-500' },
              { label: 'Task', value: teamSummary.taskPercent, color: 'bg-primary' },
              { label: 'Altro', value: Math.max(0, 100 - teamSummary.activePercent - teamSummary.taskPercent), color: 'bg-muted' },
            ]}
            members={members.slice(0, 5).map((m) => ({
              id: m.id,
              name: `${m.firstName} ${m.lastName}`,
              avatarUrl: m.avatarUrl || undefined,
            }))}
            onManageTeam={() => router.push('/tasks')}
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
            const isExpanded = expandedMember === member.id
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

                  {/* Stats row */}
                  <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{member.totalTasks}</p>
                      <p className="text-[10px] text-muted uppercase">Task attive</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{formatHoursMinutes(member.weeklyHours)}</p>
                      <p className="text-[10px] text-muted uppercase">Ore settimana</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{member.completedThisWeek}</p>
                      <p className="text-[10px] text-muted uppercase">Completate</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                    <button
                      onClick={() => setAssignModalMember(member)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-manipulation min-h-[44px] md:min-h-0"
                      title={`Assegna task a ${member.firstName}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Assegna Task
                    </button>
                    <button
                      onClick={() => handleMeetWithMember(member)}
                      disabled={meetingMemberId === member.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 touch-manipulation min-h-[44px] md:min-h-0"
                      title={`Avvia Meet con ${member.firstName}`}
                    >
                      <Video className="h-3.5 w-3.5" />
                      Meet
                    </button>
                    {member.activeTasks.length > 0 && (
                      <button
                        onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                        className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {/* Expandable active tasks */}
                  {isExpanded && member.activeTasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      <p className="text-xs font-medium text-muted uppercase tracking-wider">Task attive</p>
                      {member.activeTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                          className="w-full flex items-center gap-2 text-left text-sm p-2 rounded-md hover:bg-secondary/60 transition-colors"
                        >
                          <span className="flex-1 truncate">{task.title}</span>
                          <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="text-[10px] flex-shrink-0">
                            {task.priority}
                          </Badge>
                          <Badge variant={task.status === 'IN_PROGRESS' ? 'success' : 'outline'} className="text-[10px] flex-shrink-0">
                            {STATUS_LABELS[task.status] || task.status}
                          </Badge>
                        </button>
                      ))}
                      {member.totalTasks > 5 && (
                        <button
                          onClick={() => router.push(`/tasks?assignee=${member.id}`)}
                          className="text-xs text-primary hover:underline"
                        >
                          Vedi tutte le {member.totalTasks} task →
                        </button>
                      )}
                    </div>
                  )}

                  {member.workspaceMembers?.length > 0 && (
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

      {/* Assign Task Modal */}
      <Modal
        open={!!assignModalMember}
        onClose={() => { setAssignModalMember(null); setTaskSearch(''); setNewTaskTitle(''); setSearchResults([]) }}
        title={assignModalMember ? `Assegna task a ${assignModalMember.firstName} ${assignModalMember.lastName}` : 'Assegna task'}
        size="md"
      >
        <div className="space-y-4">
          {/* Search existing tasks */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Cerca task esistente</label>
            <Input
              placeholder="Cerca per titolo..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
            />
          </div>

          {searchLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {searchResults.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleAssignTask(task.id)}
                  disabled={assigning}
                  className="w-full flex items-center gap-2 text-left text-sm p-2 rounded-md hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <span className="flex-1 truncate">{task.title}</span>
                  <Badge variant={PRIORITY_BADGE[task.priority] || 'outline'} className="text-[10px]">
                    {task.priority}
                  </Badge>
                  <Badge variant={task.status === 'IN_PROGRESS' ? 'success' : 'outline'} className="text-[10px]">
                    {STATUS_LABELS[task.status] || task.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {taskSearch && !searchLoading && searchResults.length === 0 && (
            <p className="text-sm text-muted text-center py-2">Nessuna task trovata</p>
          )}

          {/* Create new task */}
          <div className="pt-3 border-t border-border">
            <label className="block text-sm font-medium mb-1.5">Oppure crea nuova task</label>
            <div className="flex gap-2">
              <Input
                placeholder="Titolo nuova task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreateAndAssignTask}
                disabled={!newTaskTitle.trim() || assigning}
                loading={assigning}
              >
                Crea e Assegna
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
