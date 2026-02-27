'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react'
import {
  SECTIONS,
  SECTION_LABELS,
  SECTION_ICONS,
  getDefaultSectionAccess,
  type Section,
  type SectionPermission,
  type SectionAccessMap,
} from '@/lib/section-access'
import { ROLE_PERMISSIONS } from '@/lib/permissions'
import { ROLES as BASE_ROLES, ROLE_LABELS, ROLE_BADGE } from '@/lib/constants'
import type { Role } from '@/generated/prisma/client'

interface CustomRole {
  id: string
  name: string
  description: string | null
  color: string | null
  baseRole: string
  modulePermissions: Record<string, string[]>
  sectionAccess: Record<string, SectionPermission>
  isSystem: boolean
  isActive: boolean
  createdAt: string
  _count: { users: number }
}


const MODULES = [
  { key: 'crm', label: 'CRM' },
  { key: 'erp', label: 'ERP' },
  { key: 'pm', label: 'Project Management' },
  { key: 'kb', label: 'Knowledge Base' },
  { key: 'content', label: 'Contenuti' },
  { key: 'support', label: 'Supporto' },
  { key: 'admin', label: 'Admin' },
  { key: 'chat', label: 'Chat' },
  { key: 'training', label: 'Formazione' },
]

const PERMISSIONS = ['read', 'write', 'delete', 'approve', 'admin']
const PERMISSION_LABELS: Record<string, string> = {
  read: 'Lettura',
  write: 'Scrittura',
  delete: 'Elimina',
  approve: 'Approva',
  admin: 'Admin',
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#6b7280', '#1e293b',
]

type ModalTab = 'general' | 'permissions' | 'sections'

interface FormState {
  name: string
  description: string
  color: string
  baseRole: string
  isActive: boolean
  modulePermissions: Record<string, string[]>
  sectionAccess: Record<string, SectionPermission>
}

const defaultForm: FormState = {
  name: '',
  description: '',
  color: '#6366f1',
  baseRole: 'DEVELOPER',
  isActive: true,
  modulePermissions: {},
  sectionAccess: {},
}

function buildDefaultModulePerms(baseRole: string): Record<string, string[]> {
  const perms = ROLE_PERMISSIONS[baseRole as Role]
  if (!perms) return {}
  const result: Record<string, string[]> = {}
  for (const mod of MODULES) {
    const modPerms = perms[mod.key as keyof typeof perms]
    if (modPerms) {
      result[mod.key] = [...(modPerms as string[])]
    }
  }
  return result
}

export function RolesContent() {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>('general')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => { loadRoles() }, [])

  async function loadRoles() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Errore caricamento')
      const data = await res.json()
      setRoles(data.items || [])
    } catch {
      setError('Errore nel caricamento dei ruoli')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    const perms = buildDefaultModulePerms('DEVELOPER')
    const sections = getDefaultSectionAccess('DEVELOPER' as Role)
    setForm({ ...defaultForm, modulePermissions: perms, sectionAccess: sections })
    setModalTab('general')
    setModalError('')
    setModalOpen(true)
  }

  function openEdit(role: CustomRole) {
    setEditingId(role.id)
    setForm({
      name: role.name,
      description: role.description || '',
      color: role.color || '#6366f1',
      baseRole: role.baseRole,
      isActive: role.isActive,
      modulePermissions: role.modulePermissions || buildDefaultModulePerms(role.baseRole),
      sectionAccess: role.sectionAccess || getDefaultSectionAccess(role.baseRole as Role),
    })
    setModalTab('general')
    setModalError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
  }

  async function handleSave() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      setModalError('Il nome deve avere almeno 2 caratteri')
      setModalTab('general')
      return
    }
    setSaving(true)
    setModalError('')
    try {
      const url = editingId ? `/api/roles/${editingId}` : '/api/roles'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          baseRole: form.baseRole,
          isActive: form.isActive,
          modulePermissions: form.modulePermissions,
          sectionAccess: form.sectionAccess,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setModalError(data.error || 'Errore durante il salvataggio')
        return
      }
      loadRoles()
      closeModal()
    } catch {
      setModalError('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || 'Errore eliminazione')
        return
      }
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch {
      setDeleteError('Errore di connessione')
    } finally {
      setDeleteLoading(false)
    }
  }

  function toggleModulePerm(module: string, perm: string) {
    setForm((f) => {
      const current = f.modulePermissions[module] || []
      const has = current.includes(perm)
      const next = has ? current.filter((p) => p !== perm) : [...current, perm]
      return { ...f, modulePermissions: { ...f.modulePermissions, [module]: next } }
    })
  }

  function hasPerm(module: string, perm: string): boolean {
    return (form.modulePermissions[module] || []).includes(perm)
  }

  function toggleSectionView(section: Section) {
    setForm((f) => {
      const current = f.sectionAccess[section] || { view: false, edit: false }
      const nextView = !current.view
      return {
        ...f,
        sectionAccess: {
          ...f.sectionAccess,
          [section]: { view: nextView, edit: nextView ? current.edit : false },
        },
      }
    })
  }

  function toggleSectionEdit(section: Section) {
    setForm((f) => {
      const current = f.sectionAccess[section] || { view: false, edit: false }
      return {
        ...f,
        sectionAccess: {
          ...f.sectionAccess,
          [section]: { ...current, edit: !current.edit },
        },
      }
    })
  }

  function loadDefaultPermsFromBase() {
    setForm((f) => ({ ...f, modulePermissions: buildDefaultModulePerms(f.baseRole) }))
  }

  function loadDefaultSectionsFromBase() {
    setForm((f) => ({ ...f, sectionAccess: getDefaultSectionAccess(f.baseRole as Role) as Record<string, SectionPermission> }))
  }

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted">{roles.length} ruoli configurati</p>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Ruolo
          </Button>
        </div>
        <Button onClick={openCreate} className="sm:hidden w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Ruolo
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <button onClick={() => { setError(null); loadRoles() }} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-10 w-10 rounded-lg shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded shimmer" />
                    <div className="h-3 w-56 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nessun ruolo personalizzato"
              description="Crea il primo ruolo personalizzato per gestire permessi granulari."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Ruolo
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`py-3 px-2 -mx-2 rounded-md transition-colors hover:bg-secondary/30 ${
                    !role.isActive ? 'opacity-60' : ''
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${role.color || '#6366f1'}20` }}
                      >
                        <ShieldCheck className="h-5 w-5" style={{ color: role.color || '#6366f1' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{role.name}</p>
                          {role.isSystem && <Badge variant="outline">Sistema</Badge>}
                        </div>
                        {role.description && (
                          <p className="text-sm text-muted truncate">{role.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-[52px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={ROLE_BADGE[role.baseRole] || 'default'}>
                          {ROLE_LABELS[role.baseRole] || role.baseRole}
                        </Badge>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {role._count.users}
                        </span>
                        <Badge variant={role.isActive ? 'success' : 'outline'}>
                          {role.isActive ? 'Attivo' : 'Disattivato'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(role)}
                          className="min-h-[44px] min-w-[44px] rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center touch-manipulation"
                          title="Modifica ruolo"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => { setDeleteTarget(role); setDeleteConfirmText(''); setDeleteError('') }}
                            disabled={role._count.users > 0}
                            className={`min-h-[44px] min-w-[44px] rounded-md transition-colors flex items-center justify-center touch-manipulation ${
                              role._count.users > 0
                                ? 'text-muted/30 cursor-not-allowed'
                                : 'text-muted hover:text-destructive hover:bg-destructive/10'
                            }`}
                            title={role._count.users > 0 ? `${role._count.users} utenti assegnati` : 'Elimina ruolo'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${role.color || '#6366f1'}20` }}
                    >
                      <ShieldCheck className="h-5 w-5" style={{ color: role.color || '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{role.name}</p>
                        {role.isSystem && <Badge variant="outline">Sistema</Badge>}
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted truncate">{role.description}</p>
                      )}
                    </div>
                    <Badge variant={ROLE_BADGE[role.baseRole] || 'default'}>
                      {ROLE_LABELS[role.baseRole] || role.baseRole}
                    </Badge>
                    <span className="text-sm text-muted flex items-center gap-1.5 min-w-[60px]">
                      <Users className="h-3.5 w-3.5" />
                      {role._count.users}
                    </span>
                    <Badge variant={role.isActive ? 'success' : 'outline'}>
                      {role.isActive ? 'Attivo' : 'Disattivato'}
                    </Badge>
                    <button
                      onClick={() => openEdit(role)}
                      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-secondary transition-colors"
                      title="Modifica ruolo"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => { setDeleteTarget(role); setDeleteConfirmText(''); setDeleteError('') }}
                        disabled={role._count.users > 0}
                        className={`p-1.5 rounded-md transition-colors ${
                          role._count.users > 0
                            ? 'text-muted/30 cursor-not-allowed'
                            : 'text-muted hover:text-destructive hover:bg-destructive/10'
                        }`}
                        title={role._count.users > 0 ? `${role._count.users} utenti assegnati` : 'Elimina ruolo'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmText(''); setDeleteError('') }}
        title="Elimina Ruolo"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            {deleteTarget._count.users > 0 ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-700 mb-1">Impossibile eliminare</p>
                <p className="text-sm text-muted">
                  Il ruolo <strong>{deleteTarget.name}</strong> e assegnato a {deleteTarget._count.users} utente/i.
                  Riassegna gli utenti a un altro ruolo prima di eliminare.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm">
                  Sei sicuro di voler eliminare il ruolo <strong>{deleteTarget.name}</strong>?
                  Questa azione non puo essere annullata.
                </p>
                <Input
                  placeholder={`Scrivi "${deleteTarget.name}" per confermare`}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
                {deleteError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {deleteError}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setDeleteTarget(null); setDeleteConfirmText('') }}
                  >
                    Annulla
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    loading={deleteLoading}
                    disabled={deleteConfirmText !== deleteTarget.name}
                  >
                    Elimina
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifica Ruolo' : 'Nuovo Ruolo'}
        size="xl"
        preventAccidentalClose
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto scrollbar-none">
          {(['general', 'permissions', 'sections'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setModalTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation min-h-[44px] ${
                modalTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab === 'general' ? 'Generale' : tab === 'permissions' ? 'Permessi Moduli' : 'Accesso Sezioni'}
            </button>
          ))}
        </div>

        {modalError && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {modalError}
          </div>
        )}

        {/* General Tab */}
        {modalTab === 'general' && (
          <div className="space-y-4">
            <Input
              label="Nome Ruolo *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="es. Team Leader, Senior Dev..."
            />
            <Input
              label="Descrizione (opzionale)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Breve descrizione del ruolo..."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Ruolo Base (fallback)"
                options={BASE_ROLES}
                value={form.baseRole}
                onChange={(e) => setForm((f) => ({ ...f, baseRole: e.target.value }))}
              />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Colore</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`h-8 w-8 rounded-lg border-2 transition-all ${
                        form.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-8 w-8 rounded-lg border border-border cursor-pointer"
                    title="Colore personalizzato"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div>
                <p className="text-sm font-medium">Attivo</p>
                <p className="text-xs text-muted">I ruoli disattivati non possono essere assegnati</p>
              </div>
              <button
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  form.isActive ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    form.isActive ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {modalTab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Configura i permessi per ogni modulo.</p>
              <Button variant="outline" size="sm" onClick={loadDefaultPermsFromBase}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Default da {ROLE_LABELS[form.baseRole] || form.baseRole}
              </Button>
            </div>
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
                            aria-checked={hasPerm(mod.key, perm)}
                            aria-label={`${mod.label} - ${perm}`}
                            onClick={() => toggleModulePerm(mod.key, perm)}
                            className={`h-6 w-6 min-h-[44px] min-w-[44px] rounded border-2 transition-all inline-flex items-center justify-center ${
                              hasPerm(mod.key, perm)
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {hasPerm(mod.key, perm) && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sections Tab */}
        {modalTab === 'sections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Configura la visibilita delle sezioni.</p>
              <Button variant="outline" size="sm" onClick={loadDefaultSectionsFromBase}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Default da {ROLE_LABELS[form.baseRole] || form.baseRole}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECTIONS.map((section) => {
                const Icon = SECTION_ICONS[section]
                const perm = form.sectionAccess[section] || { view: false, edit: false }
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
                      <p className="text-sm font-medium truncate">{SECTION_LABELS[section]}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleSectionView(section)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          perm.view
                            ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                            : 'bg-secondary text-muted hover:bg-secondary/80'
                        }`}
                        title={perm.view ? 'Visibile' : 'Nascosto'}
                      >
                        {perm.view ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleSectionEdit(section)}
                        disabled={!perm.view}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          perm.edit
                            ? 'bg-indigo-500/15 text-indigo-600 hover:bg-indigo-500/25'
                            : 'bg-secondary text-muted hover:bg-secondary/80'
                        } ${!perm.view ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={perm.edit ? 'Modifica attiva' : 'Solo lettura'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={closeModal}>
            Annulla
          </Button>
          <Button className="flex-1" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
            {editingId ? 'Salva Modifiche' : 'Crea Ruolo'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
