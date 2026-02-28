'use client'

import { useState, useEffect } from 'react'
import { brandClient } from '@/lib/branding-client'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { RefreshCw } from 'lucide-react'

interface GoogleStatus {
  connected: boolean
  email?: string
  scope?: string
  lastSync?: string
}

interface MicrosoftStatus {
  configured: boolean
  connected: boolean
  email?: string
  todoListId?: string
  webhookActive?: boolean
  lastSync?: string
}

interface IntegrationsSectionProps {
  setMessage: (msg: string) => void
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export function IntegrationsSection({ setMessage }: IntegrationsSectionProps) {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const [msStatus, setMsStatus] = useState<MicrosoftStatus | null>(null)
  const [msLoading, setMsLoading] = useState(true)
  const [msDisconnecting, setMsDisconnecting] = useState(false)
  const [msSyncing, setMsSyncing] = useState(false)

  useEffect(() => {
    setGoogleLoading(true)
    fetch('/api/auth/google/status')
      .then((res) => res.json())
      .then((data) => setGoogleStatus(data))
      .catch(() => setGoogleStatus({ connected: false }))
      .finally(() => setGoogleLoading(false))

    setMsLoading(true)
    fetch('/api/integrations/microsoft/status')
      .then((res) => res.json())
      .then((data) => setMsStatus(data))
      .catch(() => setMsStatus({ configured: false, connected: false }))
      .finally(() => setMsLoading(false))
  }, [])

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

  const handleMicrosoftConnect = () => {
    window.location.href = '/api/integrations/microsoft/authorize'
  }

  const handleMicrosoftDisconnect = async () => {
    setMsDisconnecting(true)
    try {
      const res = await fetch('/api/integrations/microsoft/disconnect', { method: 'POST' })
      if (res.ok) {
        setMsStatus({ configured: true, connected: false })
        setMessage('Microsoft To Do disconnesso')
      }
    } catch {
      setMessage('Errore disconnessione')
    } finally {
      setMsDisconnecting(false)
    }
  }

  const handleMicrosoftSync = async () => {
    setMsSyncing(true)
    try {
      const res = await fetch('/api/integrations/microsoft/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setMessage(data.changesApplied > 0
          ? `Sincronizzate ${data.changesApplied} modifiche da Microsoft To Do`
          : 'Nessuna modifica da sincronizzare')
      }
    } catch {
      setMessage('Errore sincronizzazione')
    } finally {
      setMsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Workspace Card */}
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
                Collega il tuo account Google Workspace per sincronizzare Calendar e Drive con {brandClient.name}.
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

      {/* Microsoft To Do Card */}
      <Card>
        <CardTitle>Microsoft To Do</CardTitle>
        <CardContent>
          {msLoading ? (
            <div className="h-20 flex items-center justify-center text-sm text-muted">
              Caricamento...
            </div>
          ) : !msStatus?.configured ? (
            <div className="space-y-5 p-1">
              <p className="text-sm text-muted">
                Integrazione Microsoft To Do non configurata. Contatta l&apos;amministratore per abilitarla.
              </p>
            </div>
          ) : msStatus?.connected ? (
            <div className="space-y-5 p-1">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#3B82F6"/>
                    <path d="M10 16.5l-3.5-3.5 1.41-1.41L10 13.67l5.59-5.59L17 9.5l-7 7z" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">Microsoft To Do</p>
                    <Badge variant="success">Connesso</Badge>
                  </div>
                  <p className="text-sm text-muted">{msStatus.email}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/30 p-4 space-y-2.5">
                <p className="text-sm font-medium text-foreground">Servizi attivi</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Sync Task bidirezionale</Badge>
                  {msStatus.webhookActive && (
                    <Badge variant="outline">Notifiche real-time</Badge>
                  )}
                </div>
                {msStatus.lastSync && (
                  <p className="text-xs text-muted pt-1">
                    Ultimo sync: {new Date(msStatus.lastSync).toLocaleString('it-IT')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMicrosoftSync}
                  disabled={msSyncing}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${msSyncing ? 'animate-spin' : ''}`} />
                  {msSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMicrosoftDisconnect}
                  disabled={msDisconnecting}
                  className="text-destructive hover:text-destructive w-full sm:w-auto"
                >
                  {msDisconnecting ? 'Disconnessione...' : 'Disconnetti Microsoft'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-1">
              <p className="text-sm text-muted">
                Collega il tuo account Microsoft per sincronizzare i task con Microsoft To Do.
              </p>
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Funzionalità disponibili</p>
                <ul className="text-sm text-muted space-y-1.5">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    Sync bidirezionale dei task con Microsoft To Do
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    Promemoria e notifiche push sul telefono
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    Visibilità task anche in Outlook e app mobile
                  </li>
                </ul>
              </div>
              <Button onClick={handleMicrosoftConnect} className="w-full sm:w-auto">
                Connetti Microsoft To Do
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
