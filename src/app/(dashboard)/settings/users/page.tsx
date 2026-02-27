'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Users, UserPlus, Search, ShieldCheck, AlertTriangle } from 'lucide-react'
import { RolesContent } from '@/components/settings/RolesContent'
import { InviteUserModal } from '@/components/settings/InviteUserModal'
import { EditUserModal } from '@/components/settings/EditUserModal'
import { UserList } from '@/components/settings/UserList'
import { type UserItem, type CustomRoleOption, ROLES } from '@/components/settings/types'

const PAGE_TABS = [
  { id: 'users' as const, label: 'Utenti', icon: Users },
  { id: 'roles' as const, label: 'Ruoli', icon: ShieldCheck },
]

type PageTab = 'users' | 'roles'

function UsersPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activePageTab = (searchParams.get('tab') as PageTab) || 'users'

  function setPageTab(tab: PageTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'users') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    router.push(`/settings/users${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [customRoles, setCustomRoles] = useState<CustomRoleOption[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
    loadCustomRoles()
  }, [])

  async function loadCustomRoles() {
    try {
      const res = await fetch('/api/roles')
      if (res.ok) {
        const data = await res.json()
        setCustomRoles((data.items || []).filter((r: { isActive: boolean }) => r.isActive).map((r: { id: string; name: string; color: string | null }) => ({ id: r.id, name: r.name, color: r.color })))
      }
    } catch {}
  }

  async function loadUsers() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        if (data?.users) setUsers(data.users)
      } else {
        setFetchError('Errore nel caricamento degli utenti')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch {}
    setEditingRole(null)
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (res.ok) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u)))
    } catch {}
  }

  async function handleImpersonate(targetUserId: string) {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      if (res.ok) window.location.href = '/dashboard'
    } catch {}
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Gestione Utenti</h1>
          <p className="text-xs md:text-sm text-muted">{users.length} utenti totali</p>
        </div>
      </div>

      {/* Page tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto scrollbar-none">
        {PAGE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activePageTab === tab.id
          return (
            <button key={tab.id} onClick={() => setPageTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          )
        })}
      </div>

      {activePageTab === 'roles' && <RolesContent />}

      {activePageTab === 'users' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-end mb-4 gap-3">
            <div className="hidden sm:block flex-shrink-0">
              <Button size="sm" onClick={() => setShowInviteForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Invita Utente
              </Button>
            </div>
            <Button onClick={() => setShowInviteForm(true)} className="sm:hidden w-full">
              <UserPlus className="h-4 w-4 mr-2" />Invita Utente
            </Button>
          </div>

          <InviteUserModal
            open={showInviteForm}
            onClose={() => setShowInviteForm(false)}
            customRoles={customRoles}
            onInvited={loadUsers}
          />

          <EditUserModal
            user={editUser}
            customRoles={customRoles}
            onClose={() => setEditUser(null)}
            onUserUpdated={(userId, data) => {
              setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data } : u)))
              if (data && 'firstName' in data) setEditUser((prev) => prev ? { ...prev, ...data } as UserItem : prev)
            }}
            onUserDeleted={(userId) => setUsers((prev) => prev.filter((u) => u.id !== userId))}
          />

          {fetchError && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{fetchError}</p>
              </div>
              <button onClick={() => loadUsers()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input placeholder="Cerca per nome o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select options={[{ value: '', label: 'Tutti i ruoli' }, ...ROLES]} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full sm:w-48" />
          </div>

          <UserList
            users={users}
            loading={loading}
            search={search}
            roleFilter={roleFilter}
            editingRole={editingRole}
            onEditingRoleChange={setEditingRole}
            onRoleChange={handleRoleChange}
            onToggleActive={handleToggleActive}
            onEditUser={setEditUser}
            onImpersonate={handleImpersonate}
          />
        </>
      )}
    </div>
  )
}

export default function UsersAdminPage() {
  return (
    <Suspense>
      <UsersPageContent />
    </Suspense>
  )
}
