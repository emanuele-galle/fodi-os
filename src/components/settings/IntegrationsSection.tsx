'use client'

import { useState, useEffect } from 'react'
import { brandClient } from '@/lib/branding-client'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface GoogleStatus {
  connected: boolean
  email?: string
  scope?: string
  lastSync?: string
}

interface IntegrationsSectionProps {
  setMessage: (msg: string) => void
}

export function IntegrationsSection({ setMessage }: IntegrationsSectionProps) {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    setGoogleLoading(true)
    fetch('/api/auth/google/status')
      .then((res) => res.json())
      .then((data) => setGoogleStatus(data))
      .catch(() => setGoogleStatus({ connected: false }))
      .finally(() => setGoogleLoading(false))
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

  return (
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
  )
}
