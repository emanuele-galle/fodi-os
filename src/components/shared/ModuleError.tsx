'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

interface ModuleErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  moduleName: string
  listUrl: string
}

export function ModuleError({ error, reset, moduleName, listUrl }: ModuleErrorProps) {
  useEffect(() => {
    console.error(`[${moduleName}] error:`, error)
  }, [error, moduleName])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Errore nel modulo {moduleName}</h2>
      <p className="text-muted mb-6 text-center max-w-md">
        Si è verificato un errore imprevisto. Puoi riprovare oppure tornare alla lista.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Riprova</Button>
        <Button variant="outline" onClick={() => window.location.href = listUrl}>
          Torna a {moduleName}
        </Button>
      </div>
    </div>
  )
}
