'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function CardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Card error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Pagina non disponibile</h2>
      <p className="text-muted mb-6 text-center max-w-md">
        Si è verificato un errore nel caricamento della scheda.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
      >
        Riprova
      </button>
    </div>
  )
}
