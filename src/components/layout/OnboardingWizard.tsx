'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Sparkles, LayoutDashboard, Users, FolderKanban, Euro,
  Bell, ArrowRight, ArrowLeft, X, CheckCircle, Shield
} from 'lucide-react'
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

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [notifRequested, setNotifRequested] = useState(false)
  const [notifDenied, setNotifDenied] = useState(false)

  const totalSteps = 5

  const handleNotifEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotifRequested(true)
        // Try push subscription in background — UI already updated
        try {
          const reg = await navigator.serviceWorker?.ready
          if (reg) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: document.querySelector<HTMLMetaElement>('meta[name="vapid-public-key"]')?.content,
            })
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sub.toJSON()),
            })
          }
        } catch {
          // Push subscription failed but permission was granted — notifRequested stays true
        }
      } else if (permission === 'denied') {
        setNotifDenied(true)
      }
    } catch {
      // Notification API not available
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
                  Benvenuto in FODI OS. Ti guideremo attraverso le funzionalita principali in pochi secondi.
                </motion.p>
              </motion.div>
            )}

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

            {step === 3 && (
              <motion.div key="step-3" {...stepTransition} className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4"
                  animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                >
                  <Bell className="h-8 w-8 text-amber-500" />
                </motion.div>
                <h2 className="text-lg font-bold mb-2">Notifiche Push</h2>
                <p className="text-sm text-muted max-w-sm mb-6">
                  Ricevi notifiche in tempo reale per task, commenti, scadenze e riunioni.
                </p>
                <AnimatePresence mode="wait">
                  {notifRequested ? (
                    <motion.div
                      key="notif-ok"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 text-emerald-500 text-sm"
                    >
                      <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </motion.div>
                      Notifiche attivate!
                    </motion.div>
                  ) : notifDenied ? (
                    <motion.div
                      key="notif-denied"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm text-muted"
                    >
                      Notifiche bloccate. Puoi attivarle dalle impostazioni del browser.
                    </motion.div>
                  ) : (
                    <motion.button
                      key="notif-btn"
                      onClick={handleNotifEnable}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Attiva notifiche
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step-4" {...stepTransition} className="flex-1 flex flex-col items-center justify-center text-center">
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
                  className="text-sm text-muted max-w-sm mb-6"
                >
                  Sei pronto per iniziare. Puoi sempre consultare la sezione Guida dalla sidebar per rivedere queste informazioni.
                </motion.p>
                <motion.button
                  onClick={handleComplete}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_16px_var(--color-primary-30)]"
                >
                  Inizia a lavorare
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        {step < 4 && (
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
