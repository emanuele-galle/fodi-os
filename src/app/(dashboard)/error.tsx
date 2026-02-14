'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Qualcosa è andato storto</h2>
      <p className="text-muted mb-6 text-center max-w-md">
        Si è verificato un errore imprevisto. Puoi riprovare oppure tornare alla dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Riprova</Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Torna alla Dashboard
        </Button>
      </div>
    </div>
  )
}
