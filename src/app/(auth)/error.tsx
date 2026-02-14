'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Errore di autenticazione</h2>
      <p className="text-muted mb-6 text-center max-w-md">
        Si è verificato un errore. Puoi riprovare oppure tornare alla pagina di login.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Riprova
        </button>
        <a
          href="/login"
          className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
        >
          Torna al Login
        </a>
      </div>
    </div>
  )
}
