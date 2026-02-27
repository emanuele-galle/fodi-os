'use client'

import { useState, useEffect } from 'react'
import { brandClient } from '@/lib/branding-client'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Bell, Mail, BellOff } from 'lucide-react'
import { CONFIGURABLE_NOTIF_TYPES } from '@/lib/notification-constants'
import { cn } from '@/lib/utils'

interface NotificationsSectionProps {
  setMessage: (msg: string) => void
}

export function NotificationsSection({ setMessage }: NotificationsSectionProps) {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [isIOSNotPWA, setIsIOSNotPWA] = useState(false)
  const [digestSaving, setDigestSaving] = useState(false)
  const [dailyDigest, setDailyDigest] = useState<boolean>(true)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { in_app: boolean; push: boolean }>>({})
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(true)
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false)

  useEffect(() => {
    // Load user digest preference
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setDailyDigest(data.user.dailyDigest !== false)
      })
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

  useEffect(() => {
    setNotifPrefsLoading(true)
    fetch('/api/notifications/preferences')
      .then((res) => res.json())
      .then((data) => {
        const prefs: Record<string, { in_app: boolean; push: boolean }> = {}
        for (const t of CONFIGURABLE_NOTIF_TYPES) {
          prefs[t.type] = { in_app: true, push: true }
        }
        if (data?.items) {
          for (const item of data.items as { type: string; channel: string; enabled: boolean }[]) {
            if (prefs[item.type]) {
              if (item.channel === 'in_app') prefs[item.type].in_app = item.enabled
              if (item.channel === 'push') prefs[item.type].push = item.enabled
            }
          }
        }
        setNotifPrefs(prefs)
      })
      .catch(() => {})
      .finally(() => setNotifPrefsLoading(false))
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
        setMessage(`Errore: assicurati di aver aggiunto ${brandClient.name} alla schermata Home (Condividi -> Aggiungi alla schermata Home)`)
      } else {
        setMessage('Errore nella gestione delle notifiche push')
      }
    } finally {
      setPushLoading(false)
    }
  }

  const handleToggleDigest = async () => {
    setDigestSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyDigest: !dailyDigest }),
      })
      if (res.ok) {
        setDailyDigest(!dailyDigest)
        setMessage(dailyDigest ? 'Riepilogo giornaliero disattivato' : 'Riepilogo giornaliero attivato')
      }
    } catch {
      setMessage('Errore di connessione')
    } finally {
      setDigestSaving(false)
    }
  }

  const handleToggleNotifPref = async (type: string, channel: 'in_app' | 'push') => {
    const current = notifPrefs[type]?.[channel] ?? true
    const newPrefs = { ...notifPrefs, [type]: { ...notifPrefs[type], [channel]: !current } }
    setNotifPrefs(newPrefs)
    setNotifPrefsSaving(true)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: [{ type, channel, enabled: !current }],
        }),
      })
    } catch {
      setNotifPrefs({ ...notifPrefs, [type]: { ...notifPrefs[type], [channel]: current } })
    } finally {
      setNotifPrefsSaving(false)
    }
  }

  return (
    <>
      <Card className="rounded-xl border border-border/20">
        <CardTitle>Riepilogo Giornaliero via Email</CardTitle>
        <CardContent>
          <div className="space-y-5 p-1">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Email Digest</p>
                    <Badge variant={dailyDigest ? 'success' : 'outline'}>
                      {dailyDigest ? 'Attivo' : 'Disattivato'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {dailyDigest
                      ? 'Ogni mattina alle 9:00 ricevi un riepilogo delle tue task via email'
                      : 'Attiva per ricevere un riepilogo giornaliero delle tue task'}
                  </p>
                </div>
              </div>

              <Button
                variant={dailyDigest ? 'outline' : 'default'}
                size="sm"
                onClick={handleToggleDigest}
                disabled={digestSaving}
                className={cn('w-full sm:w-auto', dailyDigest ? 'text-destructive hover:text-destructive' : '')}
              >
                {digestSaving
                  ? 'Salvataggio...'
                  : dailyDigest
                    ? 'Disattiva riepilogo email'
                    : 'Attiva riepilogo email'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pushSupported && (
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
                        ? `Ricevi notifiche anche quando non sei su ${brandClient.name}`
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
                    Per ricevere notifiche push su iPhone, devi prima aggiungere {brandClient.name} alla schermata Home:
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

      <Card className="rounded-xl border border-border/20">
        <CardTitle className="flex items-center gap-2">
          <BellOff className="h-4 w-4 text-muted" />
          Preferenze per tipo
        </CardTitle>
        <CardContent>
          <p className="text-sm text-muted mb-4">
            Scegli quali notifiche ricevere per ogni canale.
          </p>
          {notifPrefsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="border border-border/30 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_70px_70px] gap-2 px-3 sm:px-4 py-2.5 bg-secondary/30 border-b border-border/30">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Tipo</span>
                <span className="text-xs font-medium text-muted uppercase tracking-wide text-center">In-app</span>
                <span className="text-xs font-medium text-muted uppercase tracking-wide text-center">Push</span>
              </div>
              {CONFIGURABLE_NOTIF_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="grid grid-cols-[1fr_60px_60px] sm:grid-cols-[1fr_70px_70px] gap-2 px-3 sm:px-4 py-3 border-b border-border/20 last:border-b-0 hover:bg-secondary/20 transition-colors"
                >
                  <span className="text-sm text-foreground">{t.label}</span>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleToggleNotifPref(t.type, 'in_app')}
                      disabled={notifPrefsSaving}
                      className={cn(
                        'w-10 h-6 rounded-full relative transition-colors',
                        notifPrefs[t.type]?.in_app !== false
                          ? 'bg-primary'
                          : 'bg-secondary border border-border/50'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                          notifPrefs[t.type]?.in_app !== false ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleToggleNotifPref(t.type, 'push')}
                      disabled={notifPrefsSaving}
                      className={cn(
                        'w-10 h-6 rounded-full relative transition-colors',
                        notifPrefs[t.type]?.push !== false
                          ? 'bg-primary'
                          : 'bg-secondary border border-border/50'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                          notifPrefs[t.type]?.push !== false ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
