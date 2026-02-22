'use client'
import { brandClient } from '@/lib/branding-client'

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
  viewCount: number
  lastViewedAt: string | null
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

  const cardUrl = card ? `${brandClient.siteUrl}/c/${card.slug}` : ''

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

          {/* Analytics */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-card border border-border/30">
              <p className="text-xs text-muted mb-1">Visualizzazioni Totali</p>
              <p className="text-2xl font-bold">{card.viewCount || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-card border border-border/30">
              <p className="text-xs text-muted mb-1">Ultima Visualizzazione</p>
              <p className="text-sm font-medium">
                {card.lastViewedAt
                  ? new Date(card.lastViewedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Mai'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div>
              <DigitalCardForm card={card} onSave={handleSave} />
            </div>

            {/* Right: Preview + QR + Wallet */}
            <div className="space-y-6">
              <DigitalCardPreview card={card} />
              <DigitalCardQRCode slug={card.slug} />

              {/* Wallet Pass */}
              <div className="p-4 rounded-lg bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h3 className="text-sm font-semibold">Aggiungi al Wallet</h3>
                </div>
                <p className="text-xs text-muted mb-4">
                  Salva la tua business card nel wallet del telefono. Include un QR code per condividerla facilmente.
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/api/c/${card.slug}/wallet/apple`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    Apple Wallet
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/c/${card.slug}/wallet/google`)
                        const data = await res.json()
                        if (data.url) window.open(data.url, '_blank')
                      } catch { /* noop */ }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white border border-border/50 text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.97 2.34-2.06 3.06v2.54h3.33c1.95-1.8 3.07-4.44 3.07-7.58 0-.52-.05-1.02-.14-1.5l-.53-.25z" fill="#4285F4"/><path d="M12.17 21.5c2.78 0 5.12-.92 6.82-2.5l-3.33-2.54c-.92.62-2.1.99-3.49.99-2.69 0-4.97-1.82-5.78-4.27H2.95v2.63c1.71 3.39 5.22 5.69 9.22 5.69z" fill="#34A853"/><path d="M6.39 13.18A5.87 5.87 0 0 1 6.07 12c0-.41.07-.81.19-1.18V8.19H2.95A9.93 9.93 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.32-2.63v-.67z" fill="#FBBC05"/><path d="M12.17 5.55c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.27 2.41 14.93 1.5 12.17 1.5 8.17 1.5 4.66 3.8 2.95 7.19l3.44 2.63c.81-2.45 3.09-4.27 5.78-4.27z" fill="#EA4335"/></svg>
                    Google Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
