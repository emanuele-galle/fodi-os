'use client'

import { brandClient } from '@/lib/branding-client'
import { Calendar, Link2Off } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotConnectedState() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
          <p className="text-sm text-muted">Visualizza e gestisci i tuoi eventi</p>
        </div>
      </div>
      <EmptyState
        icon={Link2Off}
        title="Google Calendar non connesso"
        description={`Collega il tuo account Google per visualizzare e gestire i tuoi eventi direttamente da ${brandClient.name}. Assicurati di accettare tutti i permessi richiesti (Calendario, Drive, Meet).`}
        action={
          <Button onClick={() => window.location.href = '/api/auth/google'}>
            <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="" className="h-5 w-5 mr-2" />
            Connetti Google Calendar
          </Button>
        }
      />
    </div>
  )
}
