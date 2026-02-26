'use client'
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Sparkles, LayoutDashboard, Users, FolderKanban, Euro,
  Bell, ArrowRight, ArrowLeft, X, CheckCircle, Shield,
  BookOpen, Play, Download, Share
} from 'lucide-react'
import Link from 'next/link'
import type { Role } from '@/generated/prisma/client'

interface OnboardingWizardProps {
  user: { firstName: string; role: Role }
  onComplete: () => void
}

const ROLE_DESCRIPTIONS: Record<string, { title: string; capabilities: string[] }> = {
  ADMIN: {
    title: 'Amministratore',
    capabilities: ['Gestione completa del sistema', 'CRM, Contabilita, Progetti', 'Gestione utenti e permessi', 'Tutte le funzionalita'],
  },
  DIR_COMMERCIALE: {
    title: 'Direttore Commerciale',
    capabilities: ['CRM e ERP completi (admin)', 'Approvazione preventivi', 'Knowledge Base', 'Report e analytics'],
  },
  DIR_TECNICO: {
    title: 'Direttore Tecnico',
    capabilities: ['Progetti e contenuti (admin)', 'Gestione team tecnico', 'Knowledge Base', 'Support read/write'],
  },
  DIR_SUPPORT: {
    title: 'Direttore Supporto',
    capabilities: ['Supporto completo (admin)', 'CRM read/write', 'Knowledge Base', 'Report e analytics'],
  },
  COMMERCIALE: {
    title: 'Commerciale',
    capabilities: ['CRM completo e deals', 'Preventivi e proposte', 'Gestione pipeline', 'Contatti e interazioni'],
  },
  PM: {
    title: 'Project Manager',
    capabilities: ['Gestione progetti', 'Assegnazione task', 'Timeline e milestone', 'Coordinamento team'],
  },
  DEVELOPER: {
    title: 'Sviluppatore',
    capabilities: ['Task assegnati', 'Gestione progetti', 'Tracciamento ore', 'Chat e collaborazione'],
  },
  CONTENT: {
    title: 'Content Creator',
    capabilities: ['Libreria asset', 'Revisioni contenuti', 'Social media', 'Gestione progetti'],
  },
  SUPPORT: {
    title: 'Supporto',
    capabilities: ['Gestione ticket', 'CRM (lettura)', 'Progetti e task', 'Chat e collaborazione'],
  },
  CLIENT: {
    title: 'Cliente',
    capabilities: ['Portale cliente', 'Documenti condivisi'],
  },
}

const NAV_SECTIONS = [
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Panoramica generale con KPI e attivita recenti' },
  { icon: Users, label: 'CRM', desc: 'Gestione clienti, contatti, deals e pipeline' },
  { icon: FolderKanban, label: 'Progetti', desc: 'Kanban, task, milestone e tracciamento ore' },
  { icon: Euro, label: 'Contabilita', desc: 'Preventivi, spese, abbonamenti e report' },
]

const stepTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [notifRequested, setNotifRequested] = useState(false)
  const [notifDenied, setNotifDenied] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [pwaPrompt, setPwaPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isPWA, setIsPWA] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  const totalSteps = 6

  // Check Google status
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then((res) => res.json())
      .then((data) => setGoogleConnected(data?.connected === true))
      .catch(() => {})
      .finally(() => setGoogleLoading(false))
  }, [])

  // PWA install prompt
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsPWA(standalone)

    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    const handler = (e: Event) => {
      e.preventDefault()
      setPwaPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleNotifEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifRequested(true)
        try {
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
          }
        } catch {
          // Push subscription failed but permission was granted
        }
      } else if (permission === 'denied') {
        setNotifDenied(true)
      }
    } catch {
      // Notification API not available
    }
  }

  const handleGoogleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  const handlePwaInstall = async () => {
    if (pwaPrompt) {
      await pwaPrompt.prompt()
      const { outcome } = await pwaPrompt.userChoice
      if (outcome === 'accepted') {
        setIsPWA(true)
      }
      setPwaPrompt(null)
    } else if (isIOS) {
      setShowIOSGuide(true)
    }
  }

  const handleComplete = async () => {
    try {
      await fetch('/api/onboarding', { method: 'PATCH' })
    } catch {}
    onComplete()
  }

  const handleSkip = () => {
    handleComplete()
  }

  const roleInfo = ROLE_DESCRIPTIONS[user.role] || ROLE_DESCRIPTIONS.DEVELOPER

  // Top 4 guide modules for the video step
  const GUIDE_HIGHLIGHTS = [
    { slug: 'overview', label: 'Panoramica', color: '#6366f1' },
    { slug: 'crm', label: 'CRM & Pipeline', color: '#10b981' },
    { slug: 'projects', label: 'Progetti', color: '#f59e0b' },
    { slug: 'erp', label: 'Contabilita', color: '#8b5cf6' },
  ]

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-card border border-border/40 rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors z-10"
          title="Salta"
        >
          <X className="h-4 w-4 text-muted" />
        </button>

        {/* Progress */}
        <div className="flex gap-1 px-6 pt-5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full bg-border/40"
              animate={{
                backgroundColor: i <= step ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[320px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div key="step-0" {...stepTransition} className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold mb-2"
                >
                  Ciao {user.firstName}!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-muted max-w-sm"
                >
                  Benvenuto in {brandClient.name}. Ti guideremo attraverso le funzionalita principali in pochi secondi.
                </motion.p>
              </motion.div>
            )}

            {/* Step 1: Role */}
            {step === 1 && (
              <motion.div key="step-1" {...stepTransition} className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Shield className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold">Il tuo ruolo</h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-muted"
                    >
                      {roleInfo.title}
                    </motion.p>
                  </div>
                </div>
                <div className="space-y-2">
                  {roleInfo.capabilities.map((cap, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, ease: 'easeOut' }}
                      className="flex items-center gap-2 py-2 px-3 rounded-lg bg-secondary/30"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm">{cap}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Navigation */}
            {step === 2 && (
              <motion.div key="step-2" {...stepTransition} className="flex-1">
                <h2 className="text-lg font-bold mb-1">Navigazione</h2>
                <p className="text-xs text-muted mb-4">Le sezioni principali dell&apos;app</p>
                <div className="space-y-2">
                  {NAV_SECTIONS.map((section, i) => {
                    const Icon = section.icon
                    return (
                      <motion.div
                        key={section.label}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.1, ease: 'easeOut' }}
                        className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-secondary/30"
                      >
                        <motion.div
                          className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
                          animate={{ backgroundColor: ['var(--color-primary-10)', 'var(--color-primary-20)', 'var(--color-primary-10)'] }}
                          transition={{ delay: 0.5 + i * 0.3, duration: 1.5, repeat: Infinity, repeatDelay: i * 0.3 }}
                        >
                          <Icon className="h-4 w-4 text-primary" />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium">{section.label}</p>
                          <p className="text-xs text-muted">{section.desc}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Video Guide */}
            {step === 3 && (
              <motion.div key="step-3" {...stepTransition} className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-lg font-bold">Video Guide</h2>
                    <p className="text-xs text-muted">Tutorial per ogni sezione dell&apos;app</p>
                  </div>
                </div>
                <p className="text-sm text-muted mb-4">
                  Abbiamo preparato dei video tutorial per aiutarti a scoprire ogni funzionalita. Puoi guardarli quando vuoi dalla sezione Guida.
                </p>
                <div className="space-y-2 mb-4">
                  {GUIDE_HIGHLIGHTS.map((guide, i) => (
                    <motion.div
                      key={guide.slug}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, ease: 'easeOut' }}
                    >
                      <Link
                        href={`/guide/${guide.slug}`}
                        onClick={handleComplete}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                      >
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${guide.color}15` }}
                        >
                          <Play className="h-3.5 w-3.5 ml-0.5" style={{ color: guide.color }} fill={guide.color} />
                        </div>
                        <span className="text-sm font-medium flex-1">{guide.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted group-hover:text-foreground transition-colors" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Link
                    href="/guide"
                    onClick={handleComplete}
                    className="flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Vedi tutte le 9 guide complete
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {/* Step 4: Setup (Notifications + Google + Install App) */}
            {step === 4 && (
              <motion.div key="step-4" {...stepTransition} className="flex-1">
                <h2 className="text-lg font-bold mb-1">Configurazione</h2>
                <p className="text-xs text-muted mb-4">Completa il setup per un&apos;esperienza ottimale</p>
                <div className="space-y-3">
                  {/* Notifications */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl border border-border/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Notifiche Push</p>
                        <p className="text-xs text-muted">Task, scadenze e menzioni in tempo reale</p>
                      </div>
                      {notifRequested ? (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Attive
                        </div>
                      ) : notifDenied ? (
                        <span className="text-xs text-muted">Bloccate</span>
                      ) : (
                        <button
                          onClick={handleNotifEnable}
                          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-500/90 transition-colors flex-shrink-0"
                        >
                          Attiva
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* Google Connect */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl border border-border/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 48 48" className="h-5 w-5">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.01 24.01 0 000 21.56l7.98-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Google Workspace</p>
                        <p className="text-xs text-muted">Calendar, Drive e Meet</p>
                      </div>
                      {googleLoading ? (
                        <div className="h-4 w-16 rounded bg-muted/20 animate-pulse" />
                      ) : googleConnected ? (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Connesso
                        </div>
                      ) : (
                        <button
                          onClick={handleGoogleConnect}
                          className="px-3 py-1.5 bg-[#4285F4] text-white rounded-lg text-xs font-medium hover:bg-[#4285F4]/90 transition-colors flex-shrink-0"
                        >
                          Collega
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* Install App */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-xl border border-border/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <Download className="h-5 w-5 text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Scarica l&apos;App</p>
                        <p className="text-xs text-muted">Installa {brandClient.name} sul tuo dispositivo</p>
                      </div>
                      {isPWA ? (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Installata
                        </div>
                      ) : showIOSGuide ? (
                        <div className="text-xs text-muted text-right max-w-[140px]">
                          <Share className="h-3 w-3 inline text-primary" /> poi &quot;Aggiungi a Home&quot;
                        </div>
                      ) : (
                        <button
                          onClick={handlePwaInstall}
                          className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-500/90 transition-colors flex-shrink-0"
                        >
                          {isIOS ? 'Come fare' : 'Installa'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Step 5: All done */}
            {step === 5 && (
              <motion.div key="step-5" {...stepTransition} className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <motion.svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 text-emerald-500"
                  >
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </motion.div>

                {/* Decorative particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full bg-primary/40"
                    initial={{
                      x: 0, y: 0, opacity: 0, scale: 0,
                    }}
                    animate={{
                      x: Math.cos((i / 6) * Math.PI * 2) * 60,
                      y: Math.sin((i / 6) * Math.PI * 2) * 60 - 40,
                      opacity: [0, 1, 0],
                      scale: [0, 1.2, 0],
                    }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                  />
                ))}

                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="text-xl font-bold mb-2"
                >
                  Tutto pronto!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted max-w-sm mb-5"
                >
                  Sei pronto per iniziare. Puoi sempre consultare la guida dalla sidebar.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col gap-2 w-full max-w-xs"
                >
                  <button
                    onClick={handleComplete}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_16px_var(--color-primary-30)]"
                  >
                    Inizia a lavorare
                  </button>
                  <Link
                    href="/guide"
                    onClick={handleComplete}
                    className="flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    Apri il Centro Guida
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        {step < 5 && (
          <div className="px-6 pb-5 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-0 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Indietro
            </button>
            <button
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Avanti <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
