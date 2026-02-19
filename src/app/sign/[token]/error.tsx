'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function SignError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Sign error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Qualcosa è andato storto</h2>
      <p className="text-muted mb-6 text-center max-w-md">
        Si è verificato un errore durante il caricamento della pagina di firma. Puoi riprovare.
      </p>
      <Button onClick={reset}>Riprova</Button>
    </div>
  )
}
