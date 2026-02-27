'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Users, Shield, ShieldCheck, ChevronDown, Power, Pencil, LogIn,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { type UserItem, ROLES, ROLE_BADGE, ROLE_LABELS } from './types'

interface UserListProps {
  users: UserItem[]
  loading: boolean
  search: string
  roleFilter: string
  editingRole: string | null
  onEditingRoleChange: (userId: string | null) => void
  onRoleChange: (userId: string, newRole: string) => void
  onToggleActive: (userId: string, currentActive: boolean) => void
  onEditUser: (user: UserItem) => void
  onImpersonate: (userId: string) => void
}

export function UserList({
  users,
  loading,
  search,
  roleFilter,
  editingRole,
  onEditingRoleChange,
  onRoleChange,
  onToggleActive,
  onEditUser,
  onImpersonate,
}: UserListProps) {
  const filtered = users.filter((u) => {
    const matchesSearch = !search || `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <Card>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-10 w-10 rounded-full shimmer" />
                <div className="flex-1 space-y-2"><div className="h-4 w-40 rounded shimmer" /><div className="h-3 w-56 rounded shimmer" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nessun utente trovato" description={search || roleFilter ? 'Prova a modificare i filtri.' : 'Nessun utente registrato.'} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((u) => (
              <div key={u.id} className={`py-3 px-2 -mx-2 rounded-md transition-colors ${u.isActive ? 'hover:bg-secondary/30' : 'opacity-60'}`}>
                {/* Mobile layout */}
                <div className="md:hidden">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={`${u.firstName} ${u.lastName}`} src={u.avatarUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-sm text-muted truncate">{u.email}</p>
                    </div>
                    <Badge variant={ROLE_BADGE[u.role] || 'default'}>{ROLE_LABELS[u.role] || u.role}</Badge>
                  </div>
                  <div className="flex items-center justify-between pl-12">
                    {u.lastLoginAt && (<p className="text-xs text-muted">{formatDistanceToNow(new Date(u.lastLoginAt), { locale: it, addSuffix: true })}</p>)}
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditUser(u)} className="min-h-[44px] min-w-[44px] rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center touch-manipulation" title="Modifica utente" aria-label="Modifica utente"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => onToggleActive(u.id, u.isActive)} className={`min-h-[44px] min-w-[44px] rounded-md transition-colors flex items-center justify-center touch-manipulation ${u.isActive ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-muted hover:bg-secondary'}`} title={u.isActive ? 'Disattiva utente' : 'Riattiva utente'} aria-label={u.isActive ? 'Disattiva utente' : 'Riattiva utente'}><Power className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
                {/* Desktop layout */}
                <div className="hidden md:flex items-center gap-4">
                  <Avatar name={`${u.firstName} ${u.lastName}`} src={u.avatarUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-sm text-muted truncate">{u.email}</p>
                    {u.lastLoginAt && (<p className="text-xs text-muted">Ultimo accesso: {formatDistanceToNow(new Date(u.lastLoginAt), { locale: it, addSuffix: true })}</p>)}
                  </div>
                  <div className="relative">
                    {editingRole === u.id ? (
                      <select className="text-xs border border-border rounded-md bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50" value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value)} onBlur={() => onEditingRoleChange(null)} autoFocus>
                        {ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                      </select>
                    ) : (
                      <button onClick={() => onEditingRoleChange(u.id)} className="flex items-center gap-1 group" title="Cambia ruolo" aria-label="Cambia ruolo">
                        <Badge variant={ROLE_BADGE[u.role] || 'default'}>
                          {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                        <ChevronDown className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => onImpersonate(u.id)} className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Accedi come questo utente" aria-label="Accedi come questo utente"><LogIn className="h-4 w-4" /></button>
                  )}
                  <button onClick={() => onEditUser(u)} className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors" title="Modifica utente" aria-label="Modifica utente"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onToggleActive(u.id, u.isActive)} className={`p-1.5 rounded-md transition-colors ${u.isActive ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-muted hover:bg-secondary'}`} title={u.isActive ? 'Disattiva utente' : 'Riattiva utente'} aria-label={u.isActive ? 'Disattiva utente' : 'Riattiva utente'}><Power className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
