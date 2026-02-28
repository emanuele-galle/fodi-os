'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

const LS_DISMISSED_KEY = 'setup-banner-dismissed'
const LS_DISMISSED_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

interface SetupStatus {
  notifications: 'unknown' | 'granted' | 'denied' | 'default'
  google: 'loading' | 'connected' | 'disconnected'
  pushSubscribed: boolean
}

export function SetupBanner() {
  const [status, setStatus] = useState<SetupStatus>({
    notifications: 'unknown',
    google: 'loading',
    pushSubscribed: false,
  })
  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash
  const [subscribing, setSubscribing] = useState(false)

  // Check dismissed state from localStorage
   
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_DISMISSED_KEY)
      if (raw) {
        const ts = parseInt(raw, 10)
        if (Date.now() - ts < LS_DISMISSED_EXPIRY) return // still dismissed
      }
    } catch {}
    setDismissed(false)
  }, [])

  // Check notification permission
   
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setStatus((s) => ({ ...s, notifications: Notification.permission as SetupStatus['notifications'] }))
    }
  }, [])

  // Check Google connection
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setStatus((s) => ({
          ...s,
          google: data?.connected ? 'connected' : 'disconnected',
        }))
      })
      .catch(() => setStatus((s) => ({ ...s, google: 'disconnected' })))
  }, [])

  // Check push subscription
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setStatus((s) => ({ ...s, pushSubscribed: true }))
        })
      }).catch(() => {})
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(LS_DISMISSED_KEY, String(Date.now())) } catch {}
  }

  const handleEnableNotifications = async () => {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      setStatus((s) => ({ ...s, notifications: permission as SetupStatus['notifications'] }))
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker?.ready
        if (reg) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: document.querySelector<HTMLMetaElement>('meta[name="vapid-public-key"]')?.content || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          })
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub.toJSON()),
          })
          setStatus((s) => ({ ...s, pushSubscribed: true }))
        }
      }
    } catch {}
    setSubscribing(false)
  }

  const handleConnectGoogle = () => {
    window.location.href = '/api/auth/google'
  }

  // Determine what to show
  const needsNotifications = status.notifications !== 'granted' || !status.pushSubscribed
  const needsGoogle = status.google === 'disconnected'
  const notifDenied = status.notifications === 'denied'

  // Nothing to show
  if (dismissed || status.google === 'loading') return null
  if (!needsNotifications && !needsGoogle) return null

  const items: Array<{
    key: string
    icon: React.ReactNode
    label: string
    desc: string
    action: React.ReactNode
  }> = []

  if (needsNotifications && !notifDenied) {
    items.push({
      key: 'notif',
      icon: <Bell className="h-4 w-4 text-amber-500" />,
      label: 'Notifiche Push',
      desc: 'Ricevi aggiornamenti su task, scadenze e menzioni',
      action: (
        <button
          onClick={handleEnableNotifications}
          disabled={subscribing}
          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors flex items-center gap-1.5 disabled:opacity-60"
        >
          {subscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Attiva
        </button>
      ),
    })
  }

  if (needsGoogle) {
    items.push({
      key: 'google',
      icon: (
        <svg viewBox="0 0 48 48" className="h-4 w-4">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.01 24.01 0 000 21.56l7.98-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      ),
      label: 'Google Workspace',
      desc: 'Collega Calendar, Drive e Meet',
      action: (
        <button
          onClick={handleConnectGoogle}
          className="px-3 py-1.5 bg-[#4285F4] text-white rounded-lg text-xs font-medium hover:bg-[#3367D6] transition-colors"
        >
          Collega
        </button>
      ),
    })
  }

  if (items.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="mx-4 md:mx-6 mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 md:p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5">Completa la configurazione</p>
            <p className="text-xs text-muted mb-3">Abilita queste funzionalita per sfruttare al meglio la piattaforma</p>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-card border border-border/40 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted hidden md:block">{item.desc}</p>
                  </div>
                  {item.action}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-secondary/60 transition-colors flex-shrink-0"
            title="Nascondi per 7 giorni"
          >
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
