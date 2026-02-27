'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings, Bell, Lock, User, Palette, Shield, CreditCard, ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { AppearanceSection } from '@/components/settings/AppearanceSection'
import { SecuritySection } from '@/components/settings/SecuritySection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { IntegrationsSection } from '@/components/settings/IntegrationsSection'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [activeSection, setActiveSection] = useState('profile')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setLoaded(true)
      })
  }, [])

  useEffect(() => {
    const googleResult = searchParams.get('google')
    if (googleResult === 'connected') {
      setMessage('Google connesso con successo!')
    } else if (googleResult === 'error') {
      const reason = searchParams.get('reason')
      if (reason === 'insufficient_scopes') {
        setMessage('Devi accettare TUTTI i permessi richiesti da Google (Calendario, Drive, Meet). Riprova e assicurati di selezionare tutte le caselle.')
      } else {
        setMessage(`Errore connessione Google: ${reason || 'sconosciuto'}`)
      }
    }
  }, [searchParams])

  if (!loaded) return (
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
        <nav className="lg:w-60 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:border lg:border-border/30 lg:rounded-xl lg:p-2 lg:bg-secondary/20 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory lg:snap-none">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => section.href ? router.push(section.href) : setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap touch-manipulation min-h-[44px] snap-center lg:snap-align-none',
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

        <div className="flex-1 max-w-2xl space-y-6">
          {activeSection === 'profile' && <ProfileSection message={message} setMessage={setMessage} />}
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'security' && <SecuritySection />}
          {activeSection === 'notifications' && <NotificationsSection setMessage={setMessage} />}
          {activeSection === 'integrations' && <IntegrationsSection setMessage={setMessage} />}
        </div>
      </div>
    </div>
  )
}
