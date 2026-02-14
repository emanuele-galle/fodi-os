'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface QuotePdfButtonProps {
  quoteId: string
  quoteNumber: string
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
  showLabel?: boolean
}

export function QuotePdfButton({ quoteId, quoteNumber, variant = 'outline', size = 'sm', showLabel = true }: QuotePdfButtonProps) {
  const [generating, setGenerating] = useState(false)

  async function handleGeneratePdf() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/pdf`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Errore generazione PDF' }))
        alert(err.error || 'Errore generazione PDF')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGeneratePdf}
      disabled={generating}
      loading={generating}
      className="touch-manipulation"
    >
      <FileDown className="h-4 w-4" />
      {showLabel && <span className="hidden sm:inline ml-1">{generating ? 'Generazione...' : 'Scarica PDF'}</span>}
    </Button>
  )
}
