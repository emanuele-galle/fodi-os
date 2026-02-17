import { Linkedin, Instagram, Twitter, Github, Globe, Facebook, Youtube, Send } from 'lucide-react'

function TikTokIcon({ className, strokeWidth: _sw }: { className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .59.05.86.12V9.01a6.27 6.27 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.55a8.18 8.18 0 0 0 4.76 1.52V6.69h-1z" />
    </svg>
  )
}

type CardSocialsProps = {
  linkedinUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  githubUrl?: string | null
  websiteUrl?: string | null
  facebookUrl?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  telegramUrl?: string | null
}

const socialConfig = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
  instagram: { icon: Instagram, label: 'Instagram', color: '#E4405F' },
  facebook: { icon: Facebook, label: 'Facebook', color: '#1877F2' },
  tiktok: { icon: TikTokIcon, label: 'TikTok', color: '#ff0050' },
  youtube: { icon: Youtube, label: 'YouTube', color: '#FF0000' },
  twitter: { icon: Twitter, label: 'X', color: '#1DA1F2' },
  github: { icon: Github, label: 'GitHub', color: '#8b949e' },
  telegram: { icon: Send, label: 'Telegram', color: '#26A5E4' },
  website: { icon: Globe, label: 'Website', color: '#a78bfa' },
} as const

export default function CardSocials({
  linkedinUrl,
  instagramUrl,
  twitterUrl,
  githubUrl,
  websiteUrl,
  facebookUrl,
  tiktokUrl,
  youtubeUrl,
  telegramUrl,
}: CardSocialsProps) {
  type SocialKey = keyof typeof socialConfig
  const entries: { key: SocialKey; url: string }[] = []
  if (linkedinUrl) entries.push({ key: 'linkedin', url: linkedinUrl })
  if (instagramUrl) entries.push({ key: 'instagram', url: instagramUrl })
  if (facebookUrl) entries.push({ key: 'facebook', url: facebookUrl })
  if (tiktokUrl) entries.push({ key: 'tiktok', url: tiktokUrl })
  if (youtubeUrl) entries.push({ key: 'youtube', url: youtubeUrl })
  if (twitterUrl) entries.push({ key: 'twitter', url: twitterUrl })
  if (githubUrl) entries.push({ key: 'github', url: githubUrl })
  if (telegramUrl) entries.push({ key: 'telegram', url: telegramUrl })
  if (websiteUrl) entries.push({ key: 'website', url: websiteUrl })

  if (entries.length === 0) return null

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-0.5 p-2 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
        {entries.map((entry, index) => {
          const config = socialConfig[entry.key]
          const Icon = config.icon
          return (
            <a
              key={index}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-12 h-12 rounded-xl flex items-center justify-center text-white/30 transition-all duration-300 hover:text-white active:scale-90"
              style={{ animationDelay: `${index * 60}ms` }}
              aria-label={config.label}
            >
              {/* Hover glow background */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: `${config.color}15`, boxShadow: `0 0 20px ${config.color}10` }}
              />
              <Icon className="w-[22px] h-[22px] relative transition-all duration-300" strokeWidth={1.5} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
