'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl?: string | null
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      })
      if (res.ok) {
        setMessage('Profilo aggiornato con successo')
      } else {
        setMessage('Errore nel salvataggio')
      }
    } catch {
      setMessage('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Impostazioni</h1>

      <Card>
        <CardTitle>Profilo</CardTitle>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
              <div>
                <p className="font-medium">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-muted">{user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="firstName"
                label="Nome"
                value={user.firstName}
                onChange={(e) => setUser({ ...user, firstName: e.target.value })}
              />
              <Input
                id="lastName"
                label="Cognome"
                value={user.lastName}
                onChange={(e) => setUser({ ...user, lastName: e.target.value })}
              />
            </div>

            <Input
              id="email"
              label="Email"
              type="email"
              value={user.email}
              disabled
            />

            {message && (
              <p className={`text-sm ${message.includes('successo') ? 'text-green-600' : 'text-destructive'}`}>
                {message}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
