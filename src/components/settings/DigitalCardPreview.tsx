'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Card, CardContent } from '@/components/ui/Card'
import { Linkedin, Instagram, Twitter, Github, Globe, MessageCircle, Facebook, Youtube, Send } from 'lucide-react'

interface CardData {
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
  user: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avatarUrl: string | null
  }
}

interface DigitalCardPreviewProps {
  card: CardData
}

export function DigitalCardPreview({ card }: DigitalCardPreviewProps) {
  const { user } = card
  const fullName = `${user.firstName} ${user.lastName}`

  const socials = [
    { icon: Linkedin, url: card.linkedinUrl, color: 'text-[#0A66C2]' },
    { icon: Instagram, url: card.instagramUrl, color: 'text-[#E4405F]' },
    { icon: Facebook, url: card.facebookUrl, color: 'text-[#1877F2]' },
    { icon: Youtube, url: card.youtubeUrl, color: 'text-[#FF0000]' },
    { icon: Twitter, url: card.twitterUrl, color: 'text-[#1DA1F2]' },
    { icon: Github, url: card.githubUrl, color: 'text-foreground' },
    { icon: Send, url: card.telegramUrl, color: 'text-[#26A5E4]' },
    { icon: Globe, url: card.websiteUrl, color: 'text-primary' },
  ].filter((s) => s.url)

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold mb-4">Anteprima Card</h3>

          {/* Phone mockup */}
          <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-3xl border-[8px] border-gray-800 bg-white shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10" />

            {/* Card content (scaled down) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pt-10 overflow-y-auto">
              <Avatar
                src={user.avatarUrl}
                name={fullName}
                size="lg"
                className="!h-20 !w-20 text-xl mb-3"
              />
              <h2 className="text-lg font-bold text-center">{fullName}</h2>
              {card.jobTitle && (
                <p className="text-xs text-gray-600 text-center">{card.jobTitle}</p>
              )}
              {card.department && (
                <p className="text-[10px] text-gray-500 text-center">{card.department}</p>
              )}
              {card.cardBio && (
                <p className="text-[10px] text-gray-600 text-center mt-2 line-clamp-3">
                  {card.cardBio}
                </p>
              )}

              {/* Contact */}
              <div className="mt-4 w-full space-y-1">
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <span className="font-medium">Email:</span>
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-[10px] text-gray-600">
                    <span className="font-medium">Tel:</span>
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>

              {/* Social icons */}
              {socials.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                  {socials.map((social, i) => (
                    <div
                      key={i}
                      className={`h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center ${social.color}`}
                    >
                      <social.icon className="h-3.5 w-3.5" />
                    </div>
                  ))}
                </div>
              )}

              {/* WhatsApp */}
              {card.whatsappNumber && (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-[10px] font-medium">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </div>
                </div>
              )}

              {/* Status badge */}
              <div className="mt-4">
                <div
                  className={`px-2 py-1 rounded-full text-[9px] font-medium ${
                    card.isEnabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {card.isEnabled ? 'Attiva' : 'Disattivata'}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted text-center mt-4">
            Anteprima semplificata della card vista da dispositivi mobili
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
