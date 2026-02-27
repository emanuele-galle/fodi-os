'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Check, Copy } from 'lucide-react'
import { type CustomRoleOption, ROLES } from './types'

interface InviteUserModalProps {
  open: boolean
  onClose: () => void
  customRoles: CustomRoleOption[]
  onInvited: () => void
}

export function InviteUserModal({ open, onClose, customRoles, onInvited }: InviteUserModalProps) {
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', userRole: 'DEVELOPER', customRoleId: '', phone: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ password: string; email: string } | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [copiedPassword, setCopiedPassword] = useState(false)

  function handleClose() {
    onClose()
    setInviteResult(null)
    setInviteError('')
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inviteData,
          customRoleId: inviteData.customRoleId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Errore durante l\'invito')
        return
      }
      setInviteResult({ password: data.tempPassword, email: inviteData.email })
      setInviteData({ email: '', firstName: '', lastName: '', userRole: 'DEVELOPER', customRoleId: '', phone: '' })
      onInvited()
    } catch {
      setInviteError('Errore di connessione')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
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
                  aria-label="Copia password"
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
          <Button variant="secondary" className="mt-4 w-full" onClick={handleClose}>
            Chiudi
          </Button>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nome" value={inviteData.firstName} onChange={(e) => setInviteData((d) => ({ ...d, firstName: e.target.value }))} required />
            <Input label="Cognome" value={inviteData.lastName} onChange={(e) => setInviteData((d) => ({ ...d, lastName: e.target.value }))} required />
          </div>
          <Input label="Email" type="email" value={inviteData.email} onChange={(e) => setInviteData((d) => ({ ...d, email: e.target.value }))} required />
          <Input label="Telefono (opzionale)" type="tel" value={inviteData.phone} onChange={(e) => setInviteData((d) => ({ ...d, phone: e.target.value }))} placeholder="+39 ..." />
          <Select label="Ruolo Base" options={ROLES} value={inviteData.userRole} onChange={(e) => setInviteData((d) => ({ ...d, userRole: e.target.value }))} />
          {customRoles.length > 0 && (
            <Select
              label="Ruolo Personalizzato (opzionale)"
              options={[{ value: '', label: 'Nessuno (usa ruolo base)' }, ...customRoles.map((r) => ({ value: r.id, label: r.name }))]}
              value={inviteData.customRoleId}
              onChange={(e) => setInviteData((d) => ({ ...d, customRoleId: e.target.value }))}
            />
          )}
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annulla</Button>
            <Button type="submit" className="flex-1" loading={inviteLoading}>Crea Utente</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
