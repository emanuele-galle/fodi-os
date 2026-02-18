'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Users, FolderKanban, Euro, Film, LifeBuoy,
  UsersRound, MessageCircle, CalendarDays, ChevronDown, BookOpen,
  RefreshCw, Lightbulb,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface GuideSection {
  icon: React.ElementType
  title: string
  href: string
  description: string
  tips: string[]
}

const SECTIONS: GuideSection[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    href: '/dashboard',
    description: 'La panoramica generale con i KPI principali, le attivita recenti e i widget personalizzabili.',
    tips: ['Controlla la dashboard ogni mattina per avere una visione d\'insieme', 'I contatori si aggiornano in tempo reale'],
  },
  {
    icon: Users,
    title: 'CRM',
    href: '/crm/dashboard',
    description: 'Gestione clienti, contatti, interazioni, opportunita (deals) e pipeline commerciale.',
    tips: ['Usa i tag per categorizzare i clienti', 'Registra ogni interazione per non perdere il filo', 'Monitora i clienti trascurati dalla dashboard CRM'],
  },
  {
    icon: FolderKanban,
    title: 'Progetti',
    href: '/projects',
    description: 'Gestione progetti con kanban board, task, milestone, tracciamento ore e file.',
    tips: ['Usa le cartelle per organizzare i task per area', 'Assegna stime orarie per monitorare il budget', 'Collega i progetti ai clienti CRM'],
  },
  {
    icon: Euro,
    title: 'Contabilita',
    href: '/erp/quotes',
    description: 'Preventivi, spese, abbonamenti ricorrenti e report finanziari.',
    tips: ['Crea template di preventivo per velocizzare il lavoro', 'Traccia gli abbonamenti per non dimenticare i rinnovi', 'Usa i report per analizzare revenue e spese'],
  },
  {
    icon: Film,
    title: 'Contenuti',
    href: '/content/assets',
    description: 'Libreria asset digitali, processo di revisione e gestione social media.',
    tips: ['Carica gli asset nel progetto corretto', 'Usa le revisioni per feedback strutturati'],
  },
  {
    icon: LifeBuoy,
    title: 'Supporto',
    href: '/support',
    description: 'Sistema di ticketing per gestire le richieste di assistenza dei clienti.',
    tips: ['Assegna i ticket al team corretto', 'Usa le priorita per gestire le urgenze'],
  },
  {
    icon: UsersRound,
    title: 'Team',
    href: '/team',
    description: 'Gestione membri del team, tracciamento ore lavorative e log attivita.',
    tips: ['Controlla il log attivita per rimanere aggiornato', 'Usa il tracciamento ore per la fatturazione'],
  },
  {
    icon: MessageCircle,
    title: 'Chat',
    href: '/chat',
    description: 'Messaggistica in tempo reale con canali pubblici, privati e diretti.',
    tips: ['Crea canali dedicati per ogni progetto', 'Usa i messaggi diretti per comunicazioni rapide'],
  },
  {
    icon: CalendarDays,
    title: 'Calendario',
    href: '/calendar',
    description: 'Visualizza scadenze task, eventi e riunioni in un calendario unificato.',
    tips: ['Sincronizza con Google Calendar per avere tutto in un posto', 'Usa le riunioni veloci dalla topbar'],
  },
]

function AccordionItem({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <span className="flex-1 text-sm font-medium">{section.title}</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted">{section.description}</p>
          <div className="space-y-1.5">
            {section.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted">{tip}</span>
              </div>
            ))}
          </div>
          <Link
            href={section.href}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Vai a {section.title} →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function GuidePage() {
  const handleReplayOnboarding = async () => {
    // Reset onboarding status
    try {
      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
    } catch {}
    // Reload page to trigger onboarding
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Guida</h1>
            <p className="text-sm text-muted">Scopri tutte le funzionalita di FODI OS</p>
          </div>
        </div>
        <button
          onClick={handleReplayOnboarding}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Rivedi onboarding
        </button>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          {SECTIONS.map((section) => (
            <AccordionItem key={section.title} section={section} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
