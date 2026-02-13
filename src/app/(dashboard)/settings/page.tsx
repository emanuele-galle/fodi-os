'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { Badge } from '@/components/ui/Badge'
import { Settings, Bell } from 'lucide-react'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl?: string | null
}

interface GoogleStatus {
  connected: boolean
  email?: string
  scope?: string
  lastSync?: string
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)

  // Check push notification status
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setPushSupported(supported)
    if (supported && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub)
        })
      })
    }
  }, [])

  const handleTogglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/notifications/unsubscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setPushEnabled(false)
        setMessage('Notifiche push disabilitate')
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setMessage('Permesso notifiche negato dal browser')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        const subJson = sub.toJSON()
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        })
        setPushEnabled(true)
        setMessage('Notifiche push abilitate con successo')
      }
    } catch {
      setMessage('Errore nella gestione delle notifiche push')
    } finally {
      setPushLoading(false)
    }
  }

  // Check for Google callback result
  useEffect(() => {
    const googleResult = searchParams.get('google')
    if (googleResult === 'connected') {
      setMessage('Google connesso con successo!')
    } else if (googleResult === 'error') {
      const reason = searchParams.get('reason')
      setMessage(`Errore connessione Google: ${reason || 'sconosciuto'}`)
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
  }, [])

  useEffect(() => {
    setGoogleLoading(true)
    fetch('/api/auth/google/status')
      .then((res) => res.json())
      .then((data) => setGoogleStatus(data))
      .catch(() => setGoogleStatus({ connected: false }))
      .finally(() => setGoogleLoading(false))
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

  const handleGoogleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  const handleGoogleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
      if (res.ok) {
        setGoogleStatus({ connected: false })
        setMessage('Google disconnesso')
      }
    } catch {
      setMessage('Errore disconnessione')
    } finally {
      setDisconnecting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <p className="text-sm text-muted">Gestisci il tuo profilo e le integrazioni</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.includes('successo') || message.includes('connesso con successo')
            ? 'bg-primary/10 text-primary border border-primary/20'
            : message.includes('Errore') || message.includes('errore')
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : 'bg-secondary text-foreground border border-border'
        }`}>
          {message}
        </div>
      )}

      {/* Profile */}
      <Card className="mb-6">
        <CardTitle>Profilo</CardTitle>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="mb-4">
              <AvatarUpload
                name={`${user.firstName} ${user.lastName}`}
                currentUrl={user.avatarUrl}
                onUploaded={(url) => setUser({ ...user, avatarUrl: url })}
              />
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

            <Input
              id="email"
              label="Email"
              type="email"
              value={user.email}
              disabled
            />

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Google Workspace Integration */}
      <Card>
        <CardTitle>Integrazioni Google Workspace</CardTitle>
        <CardContent>
          {googleLoading ? (
            <div className="h-20 flex items-center justify-center text-sm text-muted">
              Caricamento...
            </div>
          ) : googleStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="h-6 w-6">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Google Workspace</p>
                    <p className="text-xs text-muted">{googleStatus.email}</p>
                  </div>
                </div>
                <Badge variant="success">Connesso</Badge>
              </div>

              <div className="text-xs text-muted space-y-1">
                <p>Servizi attivi: Google Calendar, Google Drive</p>
                {googleStatus.lastSync && (
                  <p>Ultimo aggiornamento: {new Date(googleStatus.lastSync).toLocaleString('it-IT')}</p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGoogleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                {disconnecting ? 'Disconnessione...' : 'Disconnetti Google'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Collega il tuo account Google Workspace per sincronizzare Calendar e Drive con FODI OS.
              </p>
              <div className="text-xs text-muted space-y-1">
                <p>Funzionalita disponibili dopo la connessione:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Visualizzazione e creazione eventi Google Calendar</li>
                  <li>Navigazione e upload file su Google Drive</li>
                </ul>
              </div>
              <Button onClick={handleGoogleConnect}>
                Connetti Google Workspace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      {pushSupported && (
        <Card className="mt-6">
          <CardTitle>Notifiche Push</CardTitle>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Notifiche Push</p>
                    <p className="text-xs text-muted">
                      {pushEnabled
                        ? 'Ricevi notifiche anche quando non sei su FODI OS'
                        : 'Abilita per ricevere notifiche in tempo reale'}
                    </p>
                  </div>
                </div>
                <Badge variant={pushEnabled ? 'success' : 'outline'}>
                  {pushEnabled ? 'Attivo' : 'Disattivato'}
                </Badge>
              </div>

              <Button
                variant={pushEnabled ? 'outline' : 'default'}
                size="sm"
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={pushEnabled ? 'text-destructive hover:text-destructive' : ''}
              >
                {pushLoading
                  ? 'Elaborazione...'
                  : pushEnabled
                    ? 'Disabilita notifiche push'
                    : 'Abilita notifiche push'}
              </Button>

              {Notification.permission === 'denied' && (
                <p className="text-xs text-destructive">
                  Le notifiche sono bloccate dal browser. Modifica le impostazioni del sito per abilitarle.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
