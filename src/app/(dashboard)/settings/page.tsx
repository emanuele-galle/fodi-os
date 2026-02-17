'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AvatarUpload } from '@/components/ui/AvatarUpload'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Settings, Bell, Lock, Sun, Moon, User, Palette, Shield, Globe, Languages, Calendar, Info, CreditCard, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

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
  createdAt?: string | null
  lastLoginAt?: string | null
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
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Amministratore', MANAGER: 'Manager', SALES: 'Commerciale', PM: 'Project Manager',
  DEVELOPER: 'Sviluppatore', CONTENT: 'Content', SUPPORT: 'Supporto', CLIENT: 'Cliente',
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

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('fodi-theme')
  if (stored === 'light' || stored === 'dark') return stored
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

  if (!user) return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 flex-shrink-0 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="flex-1 max-w-2xl">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  )

  const router = useRouter()

  const sections = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'digital-card', label: 'Card Digitale', icon: CreditCard, href: '/settings/digital-card' },
    { id: 'appearance', label: 'Aspetto', icon: Palette },
    { id: 'security', label: 'Sicurezza', icon: Lock },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
    { id: 'integrations', label: 'Integrazioni', icon: Shield },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Impostazioni</h1>
          <p className="text-xs md:text-sm text-muted">Gestisci profilo, tema, sicurezza e integrazioni</p>
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
        <nav className="lg:w-60 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:border lg:border-border/30 lg:rounded-xl lg:p-2 lg:bg-secondary/20">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => section.href ? router.push(section.href) : setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap touch-manipulation min-h-[44px] md:min-h-0',
                    activeSection === section.id && !section.href
                      ? 'bg-primary/10 text-primary border-l-2 border-primary lg:border-l-2'
                      : 'text-muted hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.href && <ArrowRight className="h-3.5 w-3.5 opacity-40" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">

          {/* Profile */}
          {activeSection === 'profile' && (
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

                    {/* Bio */}
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

                    {/* Timezone & Language */}
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

              {/* Account Info Card (read-only) */}
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
                <div className="space-y-5 p-1">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">Notifiche Push</p>
                          <Badge variant={pushEnabled ? 'success' : 'outline'}>
                            {pushEnabled ? 'Attivo' : 'Disattivato'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted">
                          {pushEnabled
                            ? 'Ricevi notifiche anche quando non sei su FODI OS'
                            : 'Abilita per ricevere notifiche in tempo reale'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={pushEnabled ? 'outline' : 'default'}
                      size="sm"
                      onClick={handleTogglePush}
                      disabled={pushLoading || isIOSNotPWA}
                      className={cn('w-full sm:w-auto', pushEnabled ? 'text-destructive hover:text-destructive' : '')}
                    >
                      {pushLoading
                        ? 'Elaborazione...'
                        : pushEnabled
                          ? 'Disabilita notifiche push'
                          : 'Abilita notifiche push'}
                    </Button>
                  </div>

                  {isIOSNotPWA && (
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-sm text-warning font-medium mb-1.5">Installazione richiesta su iPhone</p>
                      <p className="text-sm text-muted">
                        Per ricevere notifiche push su iPhone, devi prima aggiungere FODI OS alla schermata Home:
                        tocca il pulsante <strong>Condividi</strong> (quadrato con freccia) in Safari, poi <strong>Aggiungi alla schermata Home</strong>.
                        Dopo, apri l&apos;app dalla Home e torna qui per abilitare le notifiche.
                      </p>
                    </div>
                  )}

                  {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                    <p className="text-sm text-destructive">
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
                  <div className="space-y-5 p-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 48 48" className="h-7 w-7">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">Google Workspace</p>
                          <Badge variant="success">Connesso</Badge>
                        </div>
                        <p className="text-sm text-muted">{googleStatus.email}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/30 p-4 space-y-2.5">
                      <p className="text-sm font-medium text-foreground">Servizi attivi</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Google Calendar</Badge>
                        <Badge variant="outline">Google Drive</Badge>
                      </div>
                      {googleStatus.lastSync && (
                        <p className="text-xs text-muted pt-1">
                          Ultimo aggiornamento: {new Date(googleStatus.lastSync).toLocaleString('it-IT')}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoogleDisconnect}
                      disabled={disconnecting}
                      className="text-destructive hover:text-destructive w-full sm:w-auto"
                    >
                      {disconnecting ? 'Disconnessione...' : 'Disconnetti Google'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5 p-1">
                    <p className="text-sm text-muted">
                      Collega il tuo account Google Workspace per sincronizzare Calendar e Drive con FODI OS.
                    </p>
                    <div className="rounded-lg border border-border/30 p-4">
                      <p className="text-sm font-medium text-foreground mb-2">Funzionalità disponibili</p>
                      <ul className="text-sm text-muted space-y-1.5">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                          Visualizzazione e creazione eventi Google Calendar
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                          Navigazione e upload file su Google Drive
                        </li>
                      </ul>
                    </div>
                    <Button onClick={handleGoogleConnect} className="w-full sm:w-auto">
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
