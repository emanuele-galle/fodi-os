'use client'

import { useState, useCallback, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import {
  Shield, ShieldCheck, Check, Copy, Pencil, KeyRound, Trash2, Phone, Mail,
  Calendar, Clock, CheckCircle2, AlertTriangle, Camera, Eye, EyeOff, RotateCcw, LogIn,
} from 'lucide-react'
import {
  SECTIONS, SECTION_LABELS, SECTION_ICONS,
  getDefaultSectionAccess, getEffectiveSectionAccess,
  type SectionAccessMap,
} from '@/lib/section-access'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  type UserItem, type CustomRoleOption, type UserPermission, type UserStats, type ModalTab,
  ROLES, ROLE_BADGE, ROLE_LABELS, MODULES, PERMISSIONS, PERMISSION_LABELS,
} from './types'

interface EditUserModalProps {
  user: UserItem | null
  customRoles: CustomRoleOption[]
  onClose: () => void
  onUserUpdated: (userId: string, data: Partial<UserItem>) => void
  onUserDeleted: (userId: string) => void
}

export function EditUserModal({ user, customRoles, onClose, onUserUpdated, onUserDeleted }: EditUserModalProps) {
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '', role: '', customRoleId: '', avatarUrl: '' })
  const [editTab, setEditTab] = useState<ModalTab>('profile')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [copiedResetPw, setCopiedResetPw] = useState(false)

  const [userPerms, setUserPerms] = useState<UserPermission[]>([])
  const [permsLoading, setPermsLoading] = useState(false)
  const [permsSaving, setPermsSaving] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)

  const [sectionOverrideActive, setSectionOverrideActive] = useState(false)
  const [sectionAccessDraft, setSectionAccessDraft] = useState<SectionAccessMap | null>(null)
  const [sectionsSaving, setSectionsSaving] = useState(false)

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName, lastName: user.lastName, username: user.username || '',
        email: user.email, phone: user.phone || '', role: user.role,
        customRoleId: user.customRoleId || '', avatarUrl: user.avatarUrl || '',
      })
      setEditTab('profile')
      setEditError('')
      setResetResult(null)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
      setUserStats(null)
      loadUserStats(user.id)
    }
  }, [user])

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

  function handleClose() {
    onClose()
    setResetResult(null)
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
  }

  async function handleEditSave() {
    if (!user) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName, lastName: editForm.lastName, username: editForm.username,
          email: editForm.email, phone: editForm.phone || null, role: editForm.role,
          customRoleId: editForm.customRoleId || null, avatarUrl: editForm.avatarUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Errore durante il salvataggio'); return }
      onUserUpdated(user.id, data.data)
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!user) return
    setResetLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setResetResult(data.tempPassword)
      else setEditError(data.error || 'Errore reset password')
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setResetLoading(false)
    }
  }

  function copyResetPassword(password: string) {
    navigator.clipboard.writeText(password)
    setCopiedResetPw(true)
    setTimeout(() => setCopiedResetPw(false), 2000)
  }

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
      if (exists) return prev.filter((p) => !(p.module === module && p.permission === permission))
      return [...prev, { module, permission }]
    })
  }

  function hasUserPerm(module: string, permission: string): boolean {
    return userPerms.some((p) => p.module === module && p.permission === permission)
  }

  async function savePermissions() {
    if (!user) return
    setPermsSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`, {
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

  function handleTabChange(tab: ModalTab) {
    setEditTab(tab)
    if (tab === 'permissions' && user) loadPermissions(user.id)
    if (tab === 'sections' && user) {
      const hasOverride = !!user.sectionAccess
      setSectionOverrideActive(hasOverride)
      if (hasOverride) setSectionAccessDraft(user.sectionAccess)
      else setSectionAccessDraft(getDefaultSectionAccess(user.role as import('@/generated/prisma/client').Role))
    }
  }

  async function handleDeleteUser() {
    if (!user) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (res.ok) { onUserDeleted(user.id); handleClose() }
      else { const data = await res.json(); setEditError(data.error || 'Errore eliminazione utente') }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function saveSectionAccess() {
    if (!user) return
    setSectionsSaving(true)
    setEditError('')
    try {
      const payload = sectionOverrideActive ? sectionAccessDraft : null
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionAccess: payload }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || 'Errore salvataggio sezioni'); return }
      onUserUpdated(user.id, { sectionAccess: payload })
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setSectionsSaving(false)
    }
  }

  async function handleImpersonate(targetUserId: string) {
    setImpersonating(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      if (res.ok) window.location.href = '/dashboard'
      else { const data = await res.json(); setEditError(data.error || 'Errore impersonificazione') }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setImpersonating(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { setEditError('Seleziona un file immagine'); return }
    if (file.size > 5 * 1024 * 1024) { setEditError('Immagine troppo grande (max 5 MB)'); return }
    setAvatarUploading(true)
    setEditError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/chat/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) { setEditError('Errore upload immagine'); return }
      const uploadData = await uploadRes.json()
      setEditForm((prev) => ({ ...prev, avatarUrl: uploadData.fileUrl }))
    } catch {
      setEditError('Errore di connessione durante upload')
    } finally {
      setAvatarUploading(false)
    }
  }

  if (!user) return null

  return (
    <Modal open={!!user} onClose={handleClose} title="Modifica Utente" size="xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
        <div className="relative group">
          <Avatar name={`${editForm.firstName} ${editForm.lastName}`} src={editForm.avatarUrl} size="lg" />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {avatarUploading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{user.firstName} {user.lastName}</h3>
          <div className="flex items-center gap-3 text-sm text-muted mt-0.5">
            <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>
            {user.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{user.phone}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={ROLE_BADGE[user.role] || 'default'}>
              {user.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
            <Badge variant={user.isActive ? 'success' : 'outline'}>{user.isActive ? 'Attivo' : 'Disattivato'}</Badge>
          </div>
        </div>
        <div className="text-right text-xs text-muted space-y-1 hidden md:block">
          <div className="flex items-center gap-1 justify-end"><Calendar className="h-3 w-3" />Creato: {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: it })}</div>
          {user.lastLoginAt && <div className="flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />Ultimo accesso: {formatDistanceToNow(new Date(user.lastLoginAt), { locale: it, addSuffix: true })}</div>}
          {userStats && <div className="flex items-center gap-1 justify-end"><CheckCircle2 className="h-3 w-3" />{userStats.tasksCompleted}/{userStats.tasksTotal} task{userStats.hoursLogged > 0 && ` | ${userStats.hoursLogged.toFixed(1)}h`}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto scrollbar-none">
        {(['profile', 'permissions', 'sections'] as const).map((tab) => (
          <button key={tab} onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${editTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
            {tab === 'profile' ? 'Profilo' : tab === 'permissions' ? 'Permessi' : 'Sezioni'}
          </button>
        ))}
      </div>

      {editError && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{editError}
        </div>
      )}

      {/* Profile tab */}
      {editTab === 'profile' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nome" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} />
              <Input label="Cognome" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <Input label="Username" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} placeholder="nome.cognome" />
            <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Telefono" type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+39 ..." />
              <Select label="Ruolo Base" options={ROLES} value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            {customRoles.length > 0 && (
              <Select label="Ruolo Personalizzato (opzionale)"
                options={[{ value: '', label: 'Nessuno (usa ruolo base)' }, ...customRoles.map((r) => ({ value: r.id, label: r.name }))]}
                value={editForm.customRoleId} onChange={(e) => setEditForm((f) => ({ ...f, customRoleId: e.target.value }))}
              />
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEditSave} loading={editSaving} className="flex-1">Salva Modifiche</Button>
            {user.role !== 'ADMIN' && (
              <Button variant="outline" onClick={() => handleImpersonate(user.id)} loading={impersonating}>
                <LogIn className="h-4 w-4 mr-2" />Accedi come
              </Button>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4" />Reset Password</h4>
            {resetResult ? (
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted">Nuova password temporanea:</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-semibold">{resetResult}</p>
                  <button onClick={() => copyResetPassword(resetResult)} className="p-1 rounded hover:bg-background transition-colors" title="Copia password" aria-label="Copia password">
                    {copiedResetPw ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted" />}
                  </button>
                </div>
                <p className="text-xs text-muted">Comunica questa password all&apos;utente.</p>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleResetPassword} loading={resetLoading}>
                <KeyRound className="h-4 w-4 mr-2" />Genera Nuova Password
              </Button>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-destructive"><Trash2 className="h-4 w-4" />Zona Pericolosa</h4>
            {showDeleteConfirm ? (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
                <p className="text-sm">Sei sicuro di voler eliminare <strong>{user.firstName} {user.lastName}</strong>? Questa azione non puo essere annullata.</p>
                <Input placeholder={`Scrivi "${user.email}" per confermare`} value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>Annulla</Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteUser} loading={deleteLoading} disabled={deleteConfirmText !== user.email}>Elimina Definitivamente</Button>
                </div>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="h-4 w-4 mr-2" />Elimina Utente</Button>
            )}
          </div>
        </div>
      )}

      {/* Permissions tab */}
      {editTab === 'permissions' && (
        <div className="space-y-4">
          {permsLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-10 rounded shimmer" />))}</div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border/20 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Modulo</th>
                      {PERMISSIONS.map((p) => (<th key={p} className="px-2 py-3 text-center text-xs font-medium text-muted uppercase tracking-wider">{PERMISSION_LABELS[p]}</th>))}
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
                              className={`h-6 w-6 min-h-[44px] min-w-[44px] rounded border-2 transition-all inline-flex items-center justify-center ${hasUserPerm(mod.key, perm) ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
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
              <Button onClick={savePermissions} loading={permsSaving}>Salva Permessi</Button>
            </>
          )}
        </div>
      )}

      {/* Sections tab */}
      {editTab === 'sections' && sectionAccessDraft && (
        <div className="space-y-4">
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
                if (!next && user) setSectionAccessDraft(getDefaultSectionAccess(user.role as import('@/generated/prisma/client').Role))
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${sectionOverrideActive ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${sectionOverrideActive ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section]
              const perm = sectionAccessDraft[section]
              const defaults = user ? getDefaultSectionAccess(user.role as import('@/generated/prisma/client').Role) : null
              const isDefault = defaults ? perm.view === defaults[section].view && perm.edit === defaults[section].edit : false
              return (
                <div key={section} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${perm.view ? 'border-border bg-card' : 'border-border/50 bg-secondary/30 opacity-60'}`}>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${perm.view ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{SECTION_LABELS[section]}</p>
                      {sectionOverrideActive && !isDefault && (<span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Modificato dal default" />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { setSectionAccessDraft((prev) => prev ? { ...prev, [section]: { ...prev[section], view: !prev[section].view, edit: !prev[section].view ? prev[section].edit : false } } : prev) }}
                      disabled={!sectionOverrideActive}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${perm.view ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25' : 'bg-secondary text-muted hover:bg-secondary/80'} ${!sectionOverrideActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={perm.view ? 'Visibile' : 'Nascosto'}
                      aria-label={`${SECTION_LABELS[section]} - ${perm.view ? 'Visibile' : 'Nascosto'}`}
                    >
                      {perm.view ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { setSectionAccessDraft((prev) => prev ? { ...prev, [section]: { ...prev[section], edit: !prev[section].edit } } : prev) }}
                      disabled={!sectionOverrideActive || !perm.view}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${perm.edit ? 'bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/25' : 'bg-secondary text-muted hover:bg-secondary/80'} ${(!sectionOverrideActive || !perm.view) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={perm.edit ? 'Modifica attiva' : 'Solo lettura'}
                      aria-label={`${SECTION_LABELS[section]} - ${perm.edit ? 'Modifica attiva' : 'Solo lettura'}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveSectionAccess} loading={sectionsSaving} className="flex-1">Salva Sezioni</Button>
            {sectionOverrideActive && (
              <Button variant="outline" size="sm" onClick={() => { if (user) setSectionAccessDraft(getDefaultSectionAccess(user.role as import('@/generated/prisma/client').Role)) }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Ripristina Default
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
