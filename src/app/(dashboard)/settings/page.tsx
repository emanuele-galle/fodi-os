'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { Badge } from '@/components/ui/Badge'
import { Settings, Bell, Lock, Sun, Moon, Sparkles, User, Palette, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'midnight'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatarUrl?: string | null
  phone?: string | null
}

interface GoogleStatus {
  connected: boolean
  email?: string
  scope?: string
  lastSync?: string
}

const THEMES: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun, description: 'Interfaccia luminosa per ambienti ben illuminati' },
  { value: 'dark', label: 'Scuro', icon: Moon, description: 'Riduce l\'affaticamento degli occhi in ambienti bui' },
  { value: 'midnight', label: 'Mezzanotte', icon: Sparkles, description: 'Tema scuro con accenti blu profondo' },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Amministratore', MANAGER: 'Manager', SALES: 'Commerciale', PM: 'Project Manager',
  DEVELOPER: 'Sviluppatore', CONTENT: 'Content', SUPPORT: 'Supporto', CLIENT: 'Cliente',
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('fodi-theme')
  if (stored === 'light' || stored === 'dark' || stored === 'midnight') return stored
  return 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('fodi-theme', theme)
  document.cookie = `fodi-theme=${theme};path=/;max-age=31536000;SameSite=Lax`
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
  const [isIOSNotPWA, setIsIOSNotPWA] = useState(false)

  // Theme
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  // Active section
  const [activeSection, setActiveSection] = useState('profile')

  useEffect(() => {
    setCurrentTheme(getStoredTheme())
  }, [])

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setPushSupported(supported || (isIOS && !isStandalone))
    if (isIOS && !isStandalone) {
      setIsIOSNotPWA(true)
    }
    if (supported && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub)
        })
      })
    }
  }, [])

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const handleTogglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
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
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          setMessage('Configurazione push non disponibile')
          return
        }
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setMessage('Permesso notifiche negato. Vai nelle impostazioni del browser/app per abilitarle.')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
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
    } catch (err) {
      console.error('Push notification error:', err)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        setMessage('Errore: assicurati di aver aggiunto FODI OS alla schermata Home (Condividi -> Aggiungi alla schermata Home)')
      } else {
        setMessage('Errore nella gestione delle notifiche push')
      }
    } finally {
      setPushLoading(false)
    }
  }

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
          phone: user.phone || null,
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

  function selectTheme(theme: Theme) {
    setCurrentTheme(theme)
    applyTheme(theme)
  }

  if (!user) return null

  const sections = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'appearance', label: 'Aspetto', icon: Palette },
    { id: 'security', label: 'Sicurezza', icon: Lock },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
    { id: 'integrations', label: 'Integrazioni', icon: Shield },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <p className="text-sm text-muted">Gestisci profilo, tema, sicurezza e integrazioni</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.includes('successo') || message.includes('connesso con successo')
            ? 'bg-primary/10 text-primary border border-primary/20'
            : message.includes('Errore') || message.includes('errore') || message.includes('negato')
            ? 'bg-destructive/10 text-destructive border border-destructive/20'
            : 'bg-secondary text-foreground border border-border'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar navigation */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">

          {/* Profile */}
          {activeSection === 'profile' && (
            <Card>
              <CardTitle>Profilo</CardTitle>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="flex items-center gap-4">
                    <AvatarUpload
                      name={`${user.firstName} ${user.lastName}`}
                      currentUrl={user.avatarUrl}
                      onUploaded={(url) => setUser({ ...user, avatarUrl: url })}
                    />
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
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

                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <Card>
              <CardTitle>Tema</CardTitle>
              <CardContent>
                <p className="text-sm text-muted mb-4">Scegli il tema che preferisci per l&apos;interfaccia.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {THEMES.map((t) => {
                    const Icon = t.icon
                    const isActive = currentTheme === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => selectTheme(t.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/50 hover:border-primary/30 hover:bg-secondary/30'
                        )}
                      >
                        <div className={cn(
                          'p-3 rounded-full',
                          isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted'
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                          {t.label}
                        </span>
                        <span className="text-[11px] text-muted leading-tight">{t.description}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security */}
          {activeSection === 'security' && (
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
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && pushSupported && (
            <Card>
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
                    disabled={pushLoading || isIOSNotPWA}
                    className={pushEnabled ? 'text-destructive hover:text-destructive' : ''}
                  >
                    {pushLoading
                      ? 'Elaborazione...'
                      : pushEnabled
                        ? 'Disabilita notifiche push'
                        : 'Abilita notifiche push'}
                  </Button>

                  {isIOSNotPWA && (
                    <div className="p-3 rounded-md bg-warning/10 border border-warning/20">
                      <p className="text-xs text-warning font-medium mb-1">Installazione richiesta su iPhone</p>
                      <p className="text-xs text-muted">
                        Per ricevere notifiche push su iPhone, devi prima aggiungere FODI OS alla schermata Home:
                        tocca il pulsante <strong>Condividi</strong> (quadrato con freccia) in Safari, poi <strong>Aggiungi alla schermata Home</strong>.
                        Dopo, apri l&apos;app dalla Home e torna qui per abilitare le notifiche.
                      </p>
                    </div>
                  )}

                  {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                    <p className="text-xs text-destructive">
                      Le notifiche sono bloccate dal browser. Modifica le impostazioni del sito per abilitarle.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Integrations */}
          {activeSection === 'integrations' && (
            <Card>
              <CardTitle>Google Workspace</CardTitle>
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
          )}
        </div>
      </div>
    </div>
  )
}
