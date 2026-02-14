'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  X,
  Copy,
  Check,
  ChevronDown,
  Power,
  Pencil,
  KeyRound,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react'
import {
  SECTIONS,
  SECTION_LABELS,
  SECTION_ICONS,
  getDefaultSectionAccess,
  getEffectiveSectionAccess,
  type Section,
  type SectionAccessMap,
} from '@/lib/section-access'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'

interface UserItem {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  avatarUrl: string | null
  phone: string | null
  lastLoginAt: string | null
  createdAt: string
  sectionAccess: SectionAccessMap | null
}

interface UserPermission {
  module: string
  permission: string
}

interface UserStats {
  tasksCompleted: number
  tasksTotal: number
  hoursLogged: number
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES', label: 'Commerciale' },
  { value: 'PM', label: 'Resp. Progetto' },
  { value: 'DEVELOPER', label: 'Sviluppatore' },
  { value: 'CONTENT', label: 'Contenuti' },
  { value: 'SUPPORT', label: 'Assistenza' },
  { value: 'CLIENT', label: 'Cliente' },
]

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

const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

const MODULES = [
  { key: 'crm', label: 'CRM' },
  { key: 'erp', label: 'ERP' },
  { key: 'pm', label: 'Project Management' },
  { key: 'kb', label: 'Knowledge Base' },
  { key: 'content', label: 'Contenuti' },
  { key: 'support', label: 'Supporto' },
  { key: 'admin', label: 'Admin' },
]

const PERMISSIONS = ['read', 'write', 'delete', 'approve', 'admin']
const PERMISSION_LABELS: Record<string, string> = {
  read: 'Lettura',
  write: 'Scrittura',
  delete: 'Elimina',
  approve: 'Approva',
  admin: 'Admin',
}

type ModalTab = 'profile' | 'permissions' | 'sections'

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', userRole: 'DEVELOPER', phone: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ password: string; email: string } | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Edit modal state
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '', avatarUrl: '' })
  const [editTab, setEditTab] = useState<ModalTab>('profile')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Reset password state
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [copiedResetPw, setCopiedResetPw] = useState(false)

  // Permissions state
  const [userPerms, setUserPerms] = useState<UserPermission[]>([])
  const [permsLoading, setPermsLoading] = useState(false)
  const [permsSaving, setPermsSaving] = useState(false)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Stats state
  const [userStats, setUserStats] = useState<UserStats | null>(null)

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Section access state
  const [sectionOverrideActive, setSectionOverrideActive] = useState(false)
  const [sectionAccessDraft, setSectionAccessDraft] = useState<SectionAccessMap | null>(null)
  const [sectionsSaving, setSectionsSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const [fetchError, setFetchError] = useState<string | null>(null)

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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Errore durante l\'invito')
        return
      }
      setInviteResult({ password: data.tempPassword, email: inviteData.email })
      setInviteData({ email: '', firstName: '', lastName: '', userRole: 'DEVELOPER', phone: '' })
      loadUsers()
    } catch {
      setInviteError('Errore di connessione')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      }
    } catch {
      // silent
    }
    setEditingRole(null)
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u)))
      }
    } catch {
      // silent
    }
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  function copyResetPassword(password: string) {
    navigator.clipboard.writeText(password)
    setCopiedResetPw(true)
    setTimeout(() => setCopiedResetPw(false), 2000)
  }

  // Open edit modal
  const openEditModal = useCallback(async (user: UserItem) => {
    setEditUser(user)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      avatarUrl: user.avatarUrl || '',
    })
    setEditTab('profile')
    setEditError('')
    setResetResult(null)
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
    setUserStats(null)

    // Load stats
    loadUserStats(user.id)
  }, [])

  async function loadUserStats(userId: string) {
    try {
      const [tasksRes, timeRes] = await Promise.all([
        fetch(`/api/tasks?assigneeId=${userId}&limit=999`),
        fetch(`/api/time-entries?userId=${userId}&limit=999`),
      ])
      const tasksData = await tasksRes.json()
      const timeData = await timeRes.json()

      const tasks = tasksData?.items || tasksData?.tasks || []
      const totalTasks = Array.isArray(tasks) ? tasks.length : 0
      const completedTasks = Array.isArray(tasks) ? tasks.filter((t: { status: string }) => t.status === 'DONE').length : 0
      const entries = timeData?.items || timeData?.entries || []
      const totalHours = Array.isArray(entries) ? entries.reduce((sum: number, e: { hours: number }) => sum + (e.hours || 0), 0) : 0

      setUserStats({ tasksCompleted: completedTasks, tasksTotal: totalTasks, hoursLogged: totalHours })
    } catch {
      setUserStats({ tasksCompleted: 0, tasksTotal: 0, hoursLogged: 0 })
    }
  }

  function closeEditModal() {
    setEditUser(null)
    setResetResult(null)
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
  }

  async function handleEditSave() {
    if (!editUser) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone || null,
          role: editForm.role,
          avatarUrl: editForm.avatarUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Errore durante il salvataggio')
        return
      }
      // Update local state
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...data.user } : u)))
      setEditUser(data.user)
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!editUser) return
    setResetLoading(true)
    try {
      const res = await fetch(`/api/users/${editUser.id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResetResult(data.tempPassword)
      } else {
        setEditError(data.error || 'Errore reset password')
      }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setResetLoading(false)
    }
  }

  // Permissions
  async function loadPermissions(userId: string) {
    setPermsLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/permissions`)
      const data = await res.json()
      if (data?.permissions) setUserPerms(data.permissions)
    } catch {
      setUserPerms([])
    } finally {
      setPermsLoading(false)
    }
  }

  function togglePerm(module: string, permission: string) {
    setUserPerms((prev) => {
      const exists = prev.some((p) => p.module === module && p.permission === permission)
      if (exists) {
        return prev.filter((p) => !(p.module === module && p.permission === permission))
      }
      return [...prev, { module, permission }]
    })
  }

  function hasUserPerm(module: string, permission: string): boolean {
    return userPerms.some((p) => p.module === module && p.permission === permission)
  }

  async function savePermissions() {
    if (!editUser) return
    setPermsSaving(true)
    try {
      const res = await fetch(`/api/users/${editUser.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: userPerms }),
      })
      if (!res.ok) {
        const data = await res.json()
        setEditError(data.error || 'Errore salvataggio permessi')
      }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setPermsSaving(false)
    }
  }

  // Handle tab change
  function handleTabChange(tab: ModalTab) {
    setEditTab(tab)
    if (tab === 'permissions' && editUser) {
      loadPermissions(editUser.id)
    }
    if (tab === 'sections' && editUser) {
      const hasOverride = !!editUser.sectionAccess
      setSectionOverrideActive(hasOverride)
      if (hasOverride) {
        setSectionAccessDraft(editUser.sectionAccess)
      } else {
        setSectionAccessDraft(getDefaultSectionAccess(editUser.role as import('@/generated/prisma/client').Role))
      }
    }
  }

  // Delete user
  async function handleDeleteUser() {
    if (!editUser) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== editUser.id))
        closeEditModal()
      } else {
        const data = await res.json()
        setEditError(data.error || 'Errore eliminazione utente')
      }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Section access save
  async function saveSectionAccess() {
    if (!editUser) return
    setSectionsSaving(true)
    setEditError('')
    try {
      const payload = sectionOverrideActive ? sectionAccessDraft : null
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionAccess: payload }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Errore salvataggio sezioni')
        return
      }
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, sectionAccess: payload } : u)))
      setEditUser((prev) => prev ? { ...prev, sectionAccess: payload } : prev)
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setSectionsSaving(false)
    }
  }

  // Avatar upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editUser) return

    if (!file.type.startsWith('image/')) {
      setEditError('Seleziona un file immagine')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Immagine troppo grande (max 5 MB)')
      return
    }

    setAvatarUploading(true)
    setEditError('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        setEditError('Errore upload immagine')
        return
      }
      const uploadData = await uploadRes.json()
      setEditForm((prev) => ({ ...prev, avatarUrl: uploadData.fileUrl }))
    } catch {
      setEditError('Errore di connessione durante upload')
    } finally {
      setAvatarUploading(false)
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !roleFilter || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Gestione Utenti</h1>
            <p className="text-xs md:text-sm text-muted">{users.length} utenti totali</p>
          </div>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => { setShowInviteForm(true); setInviteResult(null) }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invita Utente
          </Button>
        </div>
        <Button onClick={() => { setShowInviteForm(true); setInviteResult(null) }} className="sm:hidden w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Invita Utente
        </Button>
      </div>

      {/* Invite Form Modal */}
      <Modal
        open={showInviteForm}
        onClose={() => { setShowInviteForm(false); setInviteResult(null); setInviteError('') }}
        title={inviteResult ? 'Utente Creato' : 'Invita Nuovo Utente'}
      >
        {inviteResult ? (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm text-muted mb-4">
              Comunica queste credenziali all&apos;utente:
            </p>
            <div className="bg-secondary rounded-lg p-4 text-left space-y-2">
              <div>
                <span className="text-xs text-muted">Email</span>
                <p className="text-sm font-mono">{inviteResult.email}</p>
              </div>
              <div>
                <span className="text-xs text-muted">Password temporanea</span>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold">{inviteResult.password}</p>
                  <button
                    onClick={() => copyPassword(inviteResult.password)}
                    className="p-1 rounded hover:bg-background transition-colors"
                    title="Copia password"
                  >
                    {copiedPassword ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => { setShowInviteForm(false); setInviteResult(null) }}
            >
              Chiudi
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nome"
                value={inviteData.firstName}
                onChange={(e) => setInviteData((d) => ({ ...d, firstName: e.target.value }))}
                required
              />
              <Input
                label="Cognome"
                value={inviteData.lastName}
                onChange={(e) => setInviteData((d) => ({ ...d, lastName: e.target.value }))}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={inviteData.email}
              onChange={(e) => setInviteData((d) => ({ ...d, email: e.target.value }))}
              required
            />
            <Input
              label="Telefono (opzionale)"
              type="tel"
              value={inviteData.phone}
              onChange={(e) => setInviteData((d) => ({ ...d, phone: e.target.value }))}
              placeholder="+39 ..."
            />
            <Select
              label="Ruolo"
              options={ROLES}
              value={inviteData.userRole}
              onChange={(e) => setInviteData((d) => ({ ...d, userRole: e.target.value }))}
            />
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowInviteForm(false); setInviteError('') }}
              >
                Annulla
              </Button>
              <Button type="submit" className="flex-1" loading={inviteLoading}>
                Crea Utente
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={closeEditModal} title="Modifica Utente" size="xl">
        {editUser && (<>
              {/* Header with avatar & info */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                <div className="relative group">
                  <Avatar
                    name={`${editForm.firstName} ${editForm.lastName}`}
                    src={editForm.avatarUrl}
                    size="lg"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {avatarUploading ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">
                    {editUser.firstName} {editUser.lastName}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {editUser.email}
                    </span>
                    {editUser.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {editUser.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={ROLE_BADGE[editUser.role] || 'default'}>
                      {editUser.role === 'ADMIN' || editUser.role === 'MANAGER' ? (
                        <ShieldCheck className="h-3 w-3 mr-1" />
                      ) : (
                        <Shield className="h-3 w-3 mr-1" />
                      )}
                      {ROLE_LABELS[editUser.role] || editUser.role}
                    </Badge>
                    <Badge variant={editUser.isActive ? 'success' : 'outline'}>
                      {editUser.isActive ? 'Attivo' : 'Disattivato'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-xs text-muted space-y-1 hidden md:block">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    Creato: {format(new Date(editUser.createdAt), 'dd MMM yyyy', { locale: it })}
                  </div>
                  {editUser.lastLoginAt && (
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      Ultimo accesso: {formatDistanceToNow(new Date(editUser.lastLoginAt), { locale: it, addSuffix: true })}
                    </div>
                  )}
                  {userStats && (
                    <div className="flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-3 w-3" />
                      {userStats.tasksCompleted}/{userStats.tasksTotal} task
                      {userStats.hoursLogged > 0 && ` | ${userStats.hoursLogged.toFixed(1)}h`}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto scrollbar-none">
                <button
                  onClick={() => handleTabChange('profile')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                    editTab === 'profile'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  Profilo
                </button>
                <button
                  onClick={() => handleTabChange('permissions')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                    editTab === 'permissions'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  Permessi
                </button>
                <button
                  onClick={() => handleTabChange('sections')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                    editTab === 'sections'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  Sezioni
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {editError}
                </div>
              )}

              {/* Profile Tab */}
              {editTab === 'profile' && (
                <div className="space-y-6">
                  {/* Edit fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Nome"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                      />
                      <Input
                        label="Cognome"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                      />
                    </div>
                    <Input
                      label="Email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Telefono"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+39 ..."
                      />
                      <Select
                        label="Ruolo"
                        options={ROLES}
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleEditSave} loading={editSaving} className="flex-1">
                      Salva Modifiche
                    </Button>
                  </div>

                  {/* Reset Password Section */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Reset Password
                    </h4>
                    {resetResult ? (
                      <div className="bg-secondary rounded-lg p-4 space-y-2">
                        <p className="text-sm text-muted">Nuova password temporanea:</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono font-semibold">{resetResult}</p>
                          <button
                            onClick={() => copyResetPassword(resetResult)}
                            className="p-1 rounded hover:bg-background transition-colors"
                            title="Copia password"
                          >
                            {copiedResetPw ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted">Comunica questa password all&apos;utente.</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetPassword}
                        loading={resetLoading}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Genera Nuova Password
                      </Button>
                    )}
                  </div>

                  {/* Delete Section */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Zona Pericolosa
                    </h4>
                    {showDeleteConfirm ? (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
                        <p className="text-sm">
                          Sei sicuro di voler eliminare <strong>{editUser.firstName} {editUser.lastName}</strong>?
                          Questa azione non può essere annullata. Tutti i dati associati saranno rimossi.
                        </p>
                        <Input
                          placeholder={`Scrivi "${editUser.email}" per confermare`}
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                        />
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                          >
                            Annulla
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteUser}
                            loading={deleteLoading}
                            disabled={deleteConfirmText !== editUser.email}
                          >
                            Elimina Definitivamente
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Elimina Utente
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {editTab === 'permissions' && (
                <div className="space-y-4">
                  {permsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 rounded shimmer" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-border/20 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/30">
                              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Modulo</th>
                              {PERMISSIONS.map((p) => (
                                <th key={p} className="px-2 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">
                                  {PERMISSION_LABELS[p]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {MODULES.map((mod) => (
                              <tr key={mod.key} className="border-b border-border/10 even:bg-secondary/[0.03]">
                                <td className="px-4 py-3 font-medium">{mod.label}</td>
                                {PERMISSIONS.map((perm) => (
                                  <td key={perm} className="text-center p-2">
                                    <button
                                      role="checkbox"
                                      aria-checked={hasUserPerm(mod.key, perm)}
                                      aria-label={`${mod.label} - ${perm}`}
                                      onClick={() => togglePerm(mod.key, perm)}
                                      className={`h-6 w-6 min-h-[44px] min-w-[44px] rounded border-2 transition-all inline-flex items-center justify-center ${
                                        hasUserPerm(mod.key, perm)
                                          ? 'bg-primary border-primary text-primary-foreground'
                                          : 'border-border hover:border-primary/50'
                                      }`}
                                    >
                                      {hasUserPerm(mod.key, perm) && <Check className="h-3.5 w-3.5" />}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button onClick={savePermissions} loading={permsSaving}>
                        Salva Permessi
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Sections Tab */}
              {editTab === 'sections' && sectionAccessDraft && (
                <div className="space-y-4">
                  {/* Override toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">Personalizzazione attiva</p>
                      <p className="text-xs text-muted">Se disattivo, l&apos;utente usa i permessi default del ruolo</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={sectionOverrideActive}
                      aria-label="Personalizzazione attiva"
                      onClick={() => {
                        const next = !sectionOverrideActive
                        setSectionOverrideActive(next)
                        if (!next && editUser) {
                          setSectionAccessDraft(getDefaultSectionAccess(editUser.role as import('@/generated/prisma/client').Role))
                        }
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        sectionOverrideActive ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          sectionOverrideActive ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Section cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SECTIONS.map((section) => {
                      const Icon = SECTION_ICONS[section]
                      const perm = sectionAccessDraft[section]
                      const defaults = editUser ? getDefaultSectionAccess(editUser.role as import('@/generated/prisma/client').Role) : null
                      const isDefault = defaults ? perm.view === defaults[section].view && perm.edit === defaults[section].edit : false

                      return (
                        <div
                          key={section}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            perm.view ? 'border-border bg-card' : 'border-border/50 bg-secondary/30 opacity-60'
                          }`}
                        >
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            perm.view ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted'
                          }`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{SECTION_LABELS[section]}</p>
                              {sectionOverrideActive && !isDefault && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Modificato dal default" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                setSectionAccessDraft((prev) => prev ? {
                                  ...prev,
                                  [section]: { ...prev[section], view: !prev[section].view, edit: !prev[section].view ? prev[section].edit : false },
                                } : prev)
                              }}
                              disabled={!sectionOverrideActive}
                              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                perm.view
                                  ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                                  : 'bg-secondary text-muted hover:bg-secondary/80'
                              } ${!sectionOverrideActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={perm.view ? 'Visibile' : 'Nascosto'}
                            >
                              {perm.view ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                setSectionAccessDraft((prev) => prev ? {
                                  ...prev,
                                  [section]: { ...prev[section], edit: !prev[section].edit },
                                } : prev)
                              }}
                              disabled={!sectionOverrideActive || !perm.view}
                              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                perm.edit
                                  ? 'bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/25'
                                  : 'bg-secondary text-muted hover:bg-secondary/80'
                              } ${(!sectionOverrideActive || !perm.view) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={perm.edit ? 'Modifica attiva' : 'Solo lettura'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={saveSectionAccess} loading={sectionsSaving} className="flex-1">
                      Salva Sezioni
                    </Button>
                    {sectionOverrideActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editUser) {
                            setSectionAccessDraft(getDefaultSectionAccess(editUser.role as import('@/generated/prisma/client').Role))
                          }
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Ripristina Default
                      </Button>
                    )}
                  </div>
                </div>
              )}
        </>)}
      </Modal>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => loadUsers()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Search & Filter */}
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
          options={[{ value: '', label: 'Tutti i ruoli' }, ...ROLES]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-full shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded shimmer" />
                    <div className="h-3 w-56 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nessun utente trovato"
              description={search || roleFilter ? 'Prova a modificare i filtri.' : 'Nessun utente registrato.'}
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className={`py-3 px-2 -mx-2 rounded-md transition-colors ${
                    u.isActive ? 'hover:bg-secondary/30' : 'opacity-60'
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar
                        name={`${u.firstName} ${u.lastName}`}
                        src={u.avatarUrl}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-sm text-muted truncate">{u.email}</p>
                      </div>
                      <Badge variant={ROLE_BADGE[u.role] || 'default'}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pl-12">
                      {u.lastLoginAt && (
                        <p className="text-xs text-muted">
                          {formatDistanceToNow(new Date(u.lastLoginAt), { locale: it, addSuffix: true })}
                        </p>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="min-h-[44px] min-w-[44px] rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center touch-manipulation"
                          title="Modifica utente"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`min-h-[44px] min-w-[44px] rounded-md transition-colors flex items-center justify-center touch-manipulation ${
                            u.isActive
                              ? 'text-emerald-600 hover:bg-emerald-500/10'
                              : 'text-muted hover:bg-secondary'
                          }`}
                          title={u.isActive ? 'Disattiva utente' : 'Riattiva utente'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:flex items-center gap-4">
                    <Avatar
                      name={`${u.firstName} ${u.lastName}`}
                      src={u.avatarUrl}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-sm text-muted truncate">{u.email}</p>
                      {u.lastLoginAt && (
                        <p className="text-xs text-muted">
                          Ultimo accesso: {formatDistanceToNow(new Date(u.lastLoginAt), { locale: it, addSuffix: true })}
                        </p>
                      )}
                    </div>

                    {/* Role selector */}
                    <div className="relative">
                      {editingRole === u.id ? (
                        <select
                          className="text-xs border border-border rounded-md bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          autoFocus
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingRole(u.id)}
                          className="flex items-center gap-1 group"
                          title="Cambia ruolo"
                        >
                          <Badge variant={ROLE_BADGE[u.role] || 'default'}>
                            {u.role === 'ADMIN' || u.role === 'MANAGER' ? (
                              <ShieldCheck className="h-3 w-3 mr-1" />
                            ) : (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                          <ChevronDown className="h-3 w-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors"
                      title="Modifica utente"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Active status toggle */}
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className={`p-1.5 rounded-md transition-colors ${
                        u.isActive
                          ? 'text-emerald-600 hover:bg-emerald-500/10'
                          : 'text-muted hover:bg-secondary'
                      }`}
                      title={u.isActive ? 'Disattiva utente' : 'Riattiva utente'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
