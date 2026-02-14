'use client'

import { useState } from 'react'
import { FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NewSignatureModal } from './NewSignatureModal'

interface QuoteSignButtonProps {
  quoteId: string
  quoteTitle: string
  quotePdfUrl?: string
  clientId?: string
  clientName?: string
  clientEmail?: string
  disabled?: boolean
}

export function QuoteSignButton({
  quoteId,
  quoteTitle,
  quotePdfUrl,
  clientId,
  clientName,
  clientEmail,
  disabled,
}: QuoteSignButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={disabled || !quotePdfUrl}
        title={!quotePdfUrl ? 'Genera prima il PDF del preventivo' : 'Richiedi firma digitale'}
      >
        <FileSignature className="h-4 w-4 mr-1.5" />
        Richiedi Firma
      </Button>

      <NewSignatureModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => setShowModal(false)}
        prefill={{
          documentType: 'QUOTE',
          documentId: quoteId,
          documentTitle: quoteTitle,
          documentUrl: quotePdfUrl,
          signerClientId: clientId,
          signerName: clientName,
          signerEmail: clientEmail,
        }}
      />
    </>
  )
}
