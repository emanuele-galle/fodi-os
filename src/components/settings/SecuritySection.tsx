'use client'

import { useState } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage('')

    if (newPassword !== confirmPassword) {
      setPwMessage('Le password non coincidono')
      return
    }
    if (newPassword.length < 6) {
      setPwMessage('La password deve avere almeno 6 caratteri')
      return
    }

    setPwSaving(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMessage('Password aggiornata con successo')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwMessage(data.error || 'Errore nel cambio password')
      }
    } catch {
      setPwMessage('Errore di connessione')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <Card>
      <CardTitle>Cambia Password</CardTitle>
      <CardContent>
        {pwMessage && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            pwMessage.includes('successo')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {pwMessage}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPassword"
            label="Password Attuale"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            id="newPassword"
            label="Nuova Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            id="confirmPassword"
            label="Conferma Nuova Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={confirmPassword && newPassword !== confirmPassword ? 'Le password non coincidono' : undefined}
          />
          <Button type="submit" disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}>
            {pwSaving ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
