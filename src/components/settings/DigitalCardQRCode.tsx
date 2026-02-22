'use client'
import { brandClient } from '@/lib/branding-client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

interface DigitalCardQRCodeProps {
  slug: string
}

export function DigitalCardQRCode({ slug }: DigitalCardQRCodeProps) {
  const cardUrl = `${brandClient.siteUrl}/c/${slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(cardUrl)}`

  async function downloadQR() {
    try {
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-card-${slug}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // QR download silently failed
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center text-center">
          <h3 className="text-sm font-semibold mb-4">QR Code Card</h3>

          {/* QR Image */}
          <div className="p-4 bg-white rounded-lg border border-border mb-4">
            <img
              src={qrUrl}
              alt="QR Code Card"
              className="w-48 h-48"
            />
          </div>

          {/* URL */}
          <p className="text-xs text-muted mb-1">URL Card:</p>
          <a
            href={cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline break-all mb-4"
          >
            {cardUrl}
          </a>

          {/* Download */}
          <Button size="sm" variant="outline" onClick={downloadQR}>
            <Download className="h-4 w-4 mr-2" />
            Scarica QR Code
          </Button>

          <p className="text-xs text-muted mt-4">
            Scansiona il QR per aprire la card digitale
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
