'use client'
import { brandClient } from '@/lib/branding-client'

import { Card, CardContent } from '@/components/ui/Card'
import { Linkedin, Instagram, Twitter, Github, Globe, MessageCircle, Facebook, Youtube, Send, Phone, Mail, UserPlus } from 'lucide-react'

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

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.89 2.89 2.89 0 0 1 2.88-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.24 8.24 0 0 0 4.76 1.5v-3.4a4.85 4.85 0 0 1-1-.03Z" />
    </svg>
  )
}

export function DigitalCardPreview({ card }: DigitalCardPreviewProps) {
  const { user } = card
  const fullName = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const socials = [
    { icon: Linkedin, url: card.linkedinUrl, color: '#0A66C2' },
    { icon: Instagram, url: card.instagramUrl, color: '#E4405F' },
    { icon: Facebook, url: card.facebookUrl, color: '#1877F2' },
    ...(card.tiktokUrl ? [{ icon: TikTokIcon, url: card.tiktokUrl, color: '#ffffff' }] : []),
    { icon: Youtube, url: card.youtubeUrl, color: '#FF0000' },
    { icon: Twitter, url: card.twitterUrl, color: '#1DA1F2' },
    { icon: Github, url: card.githubUrl, color: '#ffffff' },
    { icon: Send, url: card.telegramUrl, color: '#26A5E4' },
    { icon: Globe, url: card.websiteUrl, color: '#a78bfa' },
  ].filter((s) => s.url)

  const hasPhone = !!user.phone
  const hasEmail = !!user.email
  const hasWhatsapp = !!card.whatsappNumber
  const actionCount = [hasPhone, hasEmail, hasWhatsapp].filter(Boolean).length

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold mb-4">Anteprima Card</h3>

          {/* Phone mockup - Dark premium style */}
          <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2rem] border-[6px] border-zinc-800 bg-[#0a0a0f] shadow-2xl overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-800 rounded-b-2xl z-10" />

            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[200px] h-[200px] rounded-full bg-purple-600/10 blur-[80px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[160px] h-[160px] rounded-full bg-blue-600/8 blur-[60px]" />
            </div>

            {/* Card content */}
            <div className="absolute inset-0 flex flex-col items-center pt-12 px-4 overflow-y-auto">
              {/* Brand logo placeholder */}
              <div className="text-[8px] text-white/20 tracking-[0.2em] uppercase font-medium mb-5">{brandClient.slug.toUpperCase()}</div>

              {/* Avatar with ring */}
              <div className="relative w-20 h-20 mb-4">
                <div
                  className="absolute inset-0 rounded-full p-[2px]"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 10%, rgba(139,92,246,0.5), transparent 40%, rgba(99,102,241,0.4), transparent 70%)',
                  }}
                >
                  <div className="w-full h-full rounded-full bg-[#0a0a0f]" />
                </div>
                <div className="absolute inset-[3px] rounded-full overflow-hidden bg-[#12121a]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-indigo-600/30 flex items-center justify-center text-white/70 text-lg font-light">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <h2 className="text-sm font-bold text-white tracking-tight">{fullName}</h2>

              {/* Job title */}
              {card.jobTitle && (
                <p className="mt-1 text-[10px] font-medium bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  {card.jobTitle}
                </p>
              )}

              {/* Department badge */}
              {card.department && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[7px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/[0.06] tracking-wider uppercase">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {card.department}
                </div>
              )}

              {/* Bio */}
              {card.cardBio && (
                <p className="mt-2 text-[8px] text-white/30 text-center leading-relaxed line-clamp-2 max-w-[200px]">
                  {card.cardBio}
                </p>
              )}

              {/* Action buttons */}
              {actionCount > 0 && (
                <div className={`mt-4 grid gap-1.5 w-full ${actionCount >= 3 ? 'grid-cols-3' : actionCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {hasPhone && (
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                        <Phone className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-[6px] text-white/35 uppercase tracking-wider">Chiama</span>
                    </div>
                  )}
                  {hasEmail && (
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                        <Mail className="w-2.5 h-2.5 text-blue-400" />
                      </div>
                      <span className="text-[6px] text-white/35 uppercase tracking-wider">Email</span>
                    </div>
                  )}
                  {hasWhatsapp && (
                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgba(37,211,102,0.15)' }}>
                        <MessageCircle className="w-2.5 h-2.5 text-[#25D366]" />
                      </div>
                      <span className="text-[6px] text-white/35 uppercase tracking-wider">WhatsApp</span>
                    </div>
                  )}
                </div>
              )}

              {/* Save contact button */}
              <div className="mt-2.5 w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <UserPlus className="w-2.5 h-2.5 text-white/60" />
                <span className="text-[8px] text-white/60 font-medium">Salva Contatto</span>
              </div>

              {/* Social icons */}
              {socials.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                  {socials.map((social, i) => {
                    const Icon = social.icon
                    return (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                      >
                        <Icon className="w-3 h-3" style={{ color: `${social.color}80` }} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 mb-4 flex items-center gap-1.5">
                <div className="w-4 h-px bg-white/10" />
                <span className="text-[6px] text-white/15 tracking-[0.15em] uppercase">{brandClient.slug.toUpperCase()} Digital Card</span>
                <div className="w-4 h-px bg-white/10" />
              </div>
            </div>

            {/* Status badge */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <div
                className={`px-2 py-0.5 rounded-full text-[7px] font-medium ${
                  card.isEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/20 text-red-400 border border-red-500/20'
                }`}
              >
                {card.isEnabled ? 'Attiva' : 'Disattivata'}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted text-center mt-4">
            Anteprima della card come appare su dispositivi mobili
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
