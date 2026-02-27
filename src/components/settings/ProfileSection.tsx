'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { Badge } from '@/components/ui/Badge'
import { Globe, Languages, Calendar, Lock, Shield, User, Info } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'

interface UserProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string | null
  language?: string | null
  dailyDigest?: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
}

const TIMEZONES = [
  { value: 'Europe/Rome', label: 'Roma (CET/CEST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Londra (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Berlino (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
]

const LANGUAGES = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
]

interface ProfileSectionProps {
  message: string
  setMessage: (msg: string) => void
}

export function ProfileSection({ message, setMessage }: ProfileSectionProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)

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
          username: user.username || undefined,
          phone: user.phone || null,
          bio: user.bio || null,
          timezone: user.timezone || null,
          language: user.language || null,
        }),
      })
      if (res.ok) {
        setMessage('Profilo aggiornato con successo')
      } else {
        const data = await res.json()
        if (data?.field === 'username') {
          setMessage('Username già in uso, scegline un altro')
        } else {
          setMessage(data?.error || 'Errore nel salvataggio')
        }
      }
    } catch {
      setMessage('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Card className="rounded-xl border border-border/20">
        <CardTitle>Profilo</CardTitle>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center gap-3 pb-5 border-b border-border/30">
              <AvatarUpload
                name={`${user.firstName} ${user.lastName}`}
                currentUrl={user.avatarUrl}
                onUploaded={(url) => setUser({ ...user, avatarUrl: url })}
              />
              <div className="text-center">
                <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
                {user.username && (
                  <p className="text-sm text-muted">@{user.username}</p>
                )}
                <Badge variant="outline" className="mt-1">{ROLE_LABELS[user.role] || user.role}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
                <input
                  id="username"
                  type="text"
                  value={user.username || ''}
                  onChange={(e) => setUser({ ...user, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })}
                  placeholder="nome.utente"
                  maxLength={30}
                  className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
              <p className="text-xs text-muted">Minimo 3 caratteri. Solo lettere, numeri, punti, trattini e underscore.</p>
            </div>

            <Input
              id="email"
              label="Email"
              type="email"
              value={user.email}
              disabled
            />

            <Input
              id="phone"
              label="Telefono"
              type="tel"
              value={user.phone || ''}
              onChange={(e) => setUser({ ...user, phone: e.target.value })}
              placeholder="+39 333 1234567"
            />

            <div className="space-y-1.5">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Bio
              </label>
              <textarea
                id="bio"
                value={user.bio || ''}
                onChange={(e) => setUser({ ...user, bio: e.target.value })}
                placeholder="Breve descrizione del tuo ruolo..."
                maxLength={200}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
              />
              <p className="text-xs text-muted text-right">
                {(user.bio || '').length}/200
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="timezone" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted" />
                  Fuso orario
                </label>
                <select
                  id="timezone"
                  value={user.timezone || 'Europe/Rome'}
                  onChange={(e) => setUser({ ...user, timezone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="language" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-muted" />
                  Lingua
                </label>
                <select
                  id="language"
                  value={user.language || 'it'}
                  onChange={(e) => setUser({ ...user, language: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" loading={saving} className="w-full">
              Salva Modifiche
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/20">
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted" />
          Informazioni Account
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Calendar className="h-4.5 w-4.5 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Membro dal</p>
                <p className="text-sm font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Lock className="h-4.5 w-4.5 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Ultimo accesso</p>
                <p className="text-sm font-medium">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Shield className="h-4.5 w-4.5 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Ruolo</p>
                <p className="text-sm font-medium">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <User className="h-4.5 w-4.5 text-muted flex-shrink-0" />
              <div>
                <p className="text-xs text-muted">Username</p>
                <p className="text-sm font-medium">@{user.username}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
