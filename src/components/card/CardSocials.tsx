import { Linkedin, Instagram, Twitter, Github, Globe, Facebook, Youtube, Send } from 'lucide-react'

function TikTokIcon({ className }: { className?: string }) {
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
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-[#0A66C2]', hoverBg: 'hover:bg-[#0A66C2]/10', hoverBorder: 'hover:border-[#0A66C2]/25' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'hover:text-[#E4405F]', hoverBg: 'hover:bg-[#E4405F]/10', hoverBorder: 'hover:border-[#E4405F]/25' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'hover:text-[#1877F2]', hoverBg: 'hover:bg-[#1877F2]/10', hoverBorder: 'hover:border-[#1877F2]/25' },
  tiktok: { icon: TikTokIcon, label: 'TikTok', color: 'hover:text-gray-900 dark:hover:text-white', hoverBg: 'hover:bg-gray-100 dark:hover:bg-white/8', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'hover:text-[#FF0000]', hoverBg: 'hover:bg-[#FF0000]/10', hoverBorder: 'hover:border-[#FF0000]/25' },
  twitter: { icon: Twitter, label: 'X / Twitter', color: 'hover:text-[#1DA1F2]', hoverBg: 'hover:bg-[#1DA1F2]/10', hoverBorder: 'hover:border-[#1DA1F2]/25' },
  github: { icon: Github, label: 'GitHub', color: 'hover:text-gray-900 dark:hover:text-white', hoverBg: 'hover:bg-gray-100 dark:hover:bg-white/8', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600' },
  telegram: { icon: Send, label: 'Telegram', color: 'hover:text-[#26A5E4]', hoverBg: 'hover:bg-[#26A5E4]/10', hoverBorder: 'hover:border-[#26A5E4]/25' },
  website: { icon: Globe, label: 'Website', color: 'hover:text-purple-600 dark:hover:text-purple-400', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-500/10', hoverBorder: 'hover:border-purple-200 dark:hover:border-purple-500/25' },
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
  type SocialItem = { url: string; icon: typeof Linkedin | typeof TikTokIcon; label: string; color: string; hoverBg: string; hoverBorder: string }
  const socials: SocialItem[] = []
  if (linkedinUrl) socials.push({ url: linkedinUrl, ...socialConfig.linkedin })
  if (instagramUrl) socials.push({ url: instagramUrl, ...socialConfig.instagram })
  if (facebookUrl) socials.push({ url: facebookUrl, ...socialConfig.facebook })
  if (tiktokUrl) socials.push({ url: tiktokUrl, ...socialConfig.tiktok })
  if (youtubeUrl) socials.push({ url: youtubeUrl, ...socialConfig.youtube })
  if (twitterUrl) socials.push({ url: twitterUrl, ...socialConfig.twitter })
  if (githubUrl) socials.push({ url: githubUrl, ...socialConfig.github })
  if (telegramUrl) socials.push({ url: telegramUrl, ...socialConfig.telegram })
  if (websiteUrl) socials.push({ url: websiteUrl, ...socialConfig.website })

  if (socials.length === 0) return null

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1.5 p-2 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.06] backdrop-blur-sm">
        {socials.map((social, index) => {
          const Icon = social.icon
          return (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-12 h-12 rounded-xl ${social.hoverBg} ${social.hoverBorder} border border-transparent text-gray-400 dark:text-gray-500 ${social.color} transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95`}
              style={{ animationDelay: `${index * 50}ms` }}
              aria-label={social.label}
            >
              <Icon className="w-[20px] h-[20px]" strokeWidth={1.8} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
