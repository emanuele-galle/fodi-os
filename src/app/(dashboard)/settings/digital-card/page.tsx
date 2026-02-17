'use client'

import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { DigitalCardForm } from '@/components/settings/DigitalCardForm'
import { DigitalCardPreview } from '@/components/settings/DigitalCardPreview'
import { DigitalCardQRCode } from '@/components/settings/DigitalCardQRCode'

interface CardData {
  id: string
  slug: string
  jobTitle: string | null
  department: string | null
  cardBio: string | null
  linkedinUrl: string | null
  instagramUrl: string | null
  twitterUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  whatsappNumber: string | null
  facebookUrl: string | null
  tiktokUrl: string | null
  youtubeUrl: string | null
  telegramUrl: string | null
  showWizards: boolean
  isEnabled: boolean
  showBooking: boolean
  bookingDuration: number
  bookingDaysAhead: number
  bookingStartHour: number
  bookingEndHour: number
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }
}

export default function DigitalCardPage() {
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCard()
  }, [])

  async function loadCard() {
    try {
      const res = await fetch('/api/digital-card')
      if (res.ok) {
        const data = await res.json()
        setCard(data)
      } else {
        setError('Errore nel caricamento della card')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(updates: Partial<CardData>): Promise<boolean> {
    if (!card) return false
    try {
      const res = await fetch('/api/digital-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setCard({ ...card, ...updated })
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const cardUrl = card ? `https://os.fodisrl.it/c/${card.slug}` : ''

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Card Digitale NFC</h1>
            <p className="text-xs md:text-sm text-muted">Gestisci la tua business card digitale</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <div className="space-y-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[180px]" />
          </div>
        </div>
      ) : card ? (
        <>
          {cardUrl && (
            <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm font-medium text-purple-900 mb-1">URL Card Pubblica</p>
              <a
                href={cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:underline break-all"
              >
                {cardUrl}
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div>
              <DigitalCardForm card={card} onSave={handleSave} />
            </div>

            {/* Right: Preview + QR */}
            <div className="space-y-6">
              <DigitalCardPreview card={card} />
              <DigitalCardQRCode slug={card.slug} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
