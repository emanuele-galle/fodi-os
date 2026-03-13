'use client'

import { useSearchParams } from 'next/navigation'
import { Tabs } from '@/components/ui/Tabs'
import { EmailComposer } from '@/components/crm/EmailComposer'
import { CommunicationHistory } from '@/components/crm/CommunicationHistory'
import { Mail } from 'lucide-react'
import Link from 'next/link'

export default function ComunicazioniPage() {
  const searchParams = useSearchParams()
  const initialClientId = searchParams.get('clientId') || undefined

  const tabs = [
    {
      id: 'componi',
      label: 'Componi',
      content: <EmailComposer initialClientId={initialClientId} />,
    },
    {
      id: 'cronologia',
      label: 'Cronologia',
      content: <CommunicationHistory />,
    },
    {
      id: 'modelli',
      label: 'Modelli',
      content: (
        <div className="text-center py-8">
          <p className="text-muted text-sm mb-3">Gestisci i template email nelle impostazioni CRM</p>
          <Link
            href="/crm/settings/templates"
            className="text-sm text-primary hover:underline"
          >
            Vai a Gestione Template
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Centro Comunicazioni</h1>
          <p className="text-sm text-muted">Componi email AI-assistite, consulta lo storico e gestisci i template</p>
        </div>
      </div>

      <Tabs tabs={tabs} defaultTab={initialClientId ? 'componi' : undefined} />
    </div>
  )
}
