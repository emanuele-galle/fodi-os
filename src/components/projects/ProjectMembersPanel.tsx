'use client'

import { useState } from 'react'
import { Users, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { MultiUserSelect } from '@/components/ui/MultiUserSelect'

interface ProjectMember {
  id: string
  userId: string
  role: string
  joinedAt: string
  user: { id: string; firstName: string; lastName: string; email: string; role: string; avatarUrl: string | null }
}

interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface ProjectMembersPanelProps {
  projectId: string
  members: ProjectMember[]
  teamMembers: TeamMemberOption[]
  onMembersChanged: () => void
}

export function ProjectMembersPanel({ projectId, members, teamMembers, onMembersChanged }: ProjectMembersPanelProps) {
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [memberUserIds, setMemberUserIds] = useState<string[]>([])
  const [addingMembers, setAddingMembers] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  async function handleAddMembers() {
    if (memberUserIds.length === 0) return
    setAddingMembers(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: memberUserIds }),
      })
      if (res.ok) {
        setMemberUserIds([])
        setAddMemberModalOpen(false)
        onMembersChanged()
      }
    } finally {
      setAddingMembers(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingMemberId(userId)
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        onMembersChanged()
      }
    } finally {
      setRemovingMemberId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <span className="text-sm font-medium">{members.length} membri</span>
        </div>
        <div className="flex items-center gap-2">
          {teamMembers.filter((u) => !members.some((m) => m.userId === u.id)).length > 0 && (
            <Button size="sm" variant="outline" onClick={() => {
              const nonMembers = teamMembers.filter((u) => !members.some((m) => m.userId === u.id))
              setMemberUserIds(nonMembers.map((u) => u.id))
              setAddMemberModalOpen(true)
            }}>
              <Users className="h-4 w-4 mr-2" />
              Aggiungi Tutti
            </Button>
          )}
          <Button size="sm" onClick={() => { setMemberUserIds([]); setAddMemberModalOpen(true) }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Aggiungi
          </Button>
        </div>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun membro assegnato a questo progetto.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={`${m.user.firstName} ${m.user.lastName}`} src={m.user.avatarUrl} size="sm" />
                <div>
                  <p className="text-sm font-medium">{m.user.firstName} {m.user.lastName}</p>
                  <p className="text-xs text-muted">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'OWNER' ? 'default' : 'outline'}>
                  {m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : 'Membro'}
                </Badge>
                <button
                  onClick={() => handleRemoveMember(m.userId)}
                  disabled={removingMemberId === m.userId}
                  className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Rimuovi dal progetto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addMemberModalOpen} onClose={() => setAddMemberModalOpen(false)} title="Aggiungi Membri al Progetto" size="md">
        <div className="space-y-4">
          <MultiUserSelect
            users={teamMembers.filter((u) => !members.some((m) => m.userId === u.id))}
            selected={memberUserIds}
            onChange={setMemberUserIds}
            label="Seleziona utenti"
            placeholder="Cerca utenti..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddMemberModalOpen(false)}>Annulla</Button>
            <Button onClick={handleAddMembers} disabled={addingMembers || memberUserIds.length === 0}>
              {addingMembers ? 'Salvataggio...' : `Aggiungi ${memberUserIds.length > 0 ? `(${memberUserIds.length})` : ''}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
