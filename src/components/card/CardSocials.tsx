import { Linkedin, Instagram, Twitter, Github, Globe } from 'lucide-react'

type CardSocialsProps = {
  linkedinUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  githubUrl?: string | null
  websiteUrl?: string | null
}

const socialConfig = {
  linkedin: { icon: Linkedin, label: 'LinkedIn', color: 'hover:text-[#0A66C2]', hoverBg: 'hover:bg-[#0A66C2]/8', hoverBorder: 'hover:border-[#0A66C2]/20' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'hover:text-[#E4405F]', hoverBg: 'hover:bg-[#E4405F]/8', hoverBorder: 'hover:border-[#E4405F]/20' },
  twitter: { icon: Twitter, label: 'X / Twitter', color: 'hover:text-[#1DA1F2]', hoverBg: 'hover:bg-[#1DA1F2]/8', hoverBorder: 'hover:border-[#1DA1F2]/20' },
  github: { icon: Github, label: 'GitHub', color: 'hover:text-gray-900 dark:hover:text-white', hoverBg: 'hover:bg-gray-100 dark:hover:bg-white/5', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600' },
  website: { icon: Globe, label: 'Website', color: 'hover:text-purple-600 dark:hover:text-purple-400', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-500/8', hoverBorder: 'hover:border-purple-200 dark:hover:border-purple-500/20' },
} as const

export default function CardSocials({
  linkedinUrl,
  instagramUrl,
  twitterUrl,
  githubUrl,
  websiteUrl,
}: CardSocialsProps) {
  type SocialItem = { url: string; icon: typeof Linkedin; label: string; color: string; hoverBg: string; hoverBorder: string }
  const socials: SocialItem[] = []
  if (linkedinUrl) socials.push({ url: linkedinUrl, ...socialConfig.linkedin })
  if (instagramUrl) socials.push({ url: instagramUrl, ...socialConfig.instagram })
  if (twitterUrl) socials.push({ url: twitterUrl, ...socialConfig.twitter })
  if (githubUrl) socials.push({ url: githubUrl, ...socialConfig.github })
  if (websiteUrl) socials.push({ url: websiteUrl, ...socialConfig.website })

  if (socials.length === 0) return null

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/40 dark:border-white/[0.06] backdrop-blur-sm">
        {socials.map((social, index) => {
          const Icon = social.icon
          return (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-10 h-10 rounded-xl ${social.hoverBg} ${social.hoverBorder} border border-transparent text-gray-400 dark:text-gray-500 ${social.color} transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95`}
              aria-label={social.label}
            >
              <Icon className="w-[17px] h-[17px]" strokeWidth={1.8} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
