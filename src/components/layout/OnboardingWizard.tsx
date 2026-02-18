'use client'

import { useState } from 'react'
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
  MANAGER: {
    title: 'Manager',
    capabilities: ['CRM e gestione clienti', 'Approvazione preventivi', 'Gestione progetti e team', 'Report e analytics'],
  },
  SALES: {
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

export function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [notifRequested, setNotifRequested] = useState(false)

  const totalSteps = 5

  const handleNotifEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        // Try to subscribe for push
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
        setNotifRequested(true)
      }
    } catch {
      // Silently ignore
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-card border border-border/40 rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg overflow-hidden">
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
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-border/40'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[320px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ciao {user.firstName}!</h2>
              <p className="text-sm text-muted max-w-sm">
                Benvenuto in FODI OS. Ti guideremo attraverso le funzionalita principali in pochi secondi.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Il tuo ruolo</h2>
                  <p className="text-xs text-muted">{roleInfo.title}</p>
                </div>
              </div>
              <div className="space-y-2">
                {roleInfo.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-secondary/30">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm">{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Navigazione</h2>
              <p className="text-xs text-muted mb-4">Le sezioni principali dell&apos;app</p>
              <div className="space-y-2">
                {NAV_SECTIONS.map((section) => {
                  const Icon = section.icon
                  return (
                    <div key={section.label} className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-secondary/30">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{section.label}</p>
                        <p className="text-xs text-muted">{section.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold mb-2">Notifiche Push</h2>
              <p className="text-sm text-muted max-w-sm mb-6">
                Ricevi notifiche in tempo reale per task, commenti, scadenze e riunioni.
              </p>
              {notifRequested ? (
                <div className="flex items-center gap-2 text-emerald-500 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Notifiche attivate!
                </div>
              ) : (
                <button
                  onClick={handleNotifEnable}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Attiva notifiche
                </button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Tutto pronto!</h2>
              <p className="text-sm text-muted max-w-sm mb-6">
                Sei pronto per iniziare. Puoi sempre consultare la sezione Guida dalla sidebar per rivedere queste informazioni.
              </p>
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Inizia a lavorare
              </button>
            </div>
          )}
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
      </div>
    </div>
  )
}
