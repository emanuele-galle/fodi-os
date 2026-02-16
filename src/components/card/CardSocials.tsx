import { Linkedin, Instagram, Twitter, Github, Globe } from 'lucide-react'

type CardSocialsProps = {
  linkedinUrl?: string | null
  instagramUrl?: string | null
  twitterUrl?: string | null
  githubUrl?: string | null
  websiteUrl?: string | null
}

export default function CardSocials({
  linkedinUrl,
  instagramUrl,
  twitterUrl,
  githubUrl,
  websiteUrl,
}: CardSocialsProps) {
  type Social = { url: string; icon: typeof Linkedin; label: string; color: string; hoverBg: string; hoverBorder: string }
  const socials: Social[] = [
    ...(linkedinUrl ? [{ url: linkedinUrl, icon: Linkedin, label: 'LinkedIn', color: 'text-[#0A66C2]', hoverBg: 'hover:bg-[#0A66C2]/10', hoverBorder: 'hover:border-[#0A66C2]/30' }] : []),
    ...(instagramUrl ? [{ url: instagramUrl, icon: Instagram, label: 'Instagram', color: 'text-[#E4405F]', hoverBg: 'hover:bg-[#E4405F]/10', hoverBorder: 'hover:border-[#E4405F]/30' }] : []),
    ...(twitterUrl ? [{ url: twitterUrl, icon: Twitter, label: 'Twitter', color: 'text-[#1DA1F2]', hoverBg: 'hover:bg-[#1DA1F2]/10', hoverBorder: 'hover:border-[#1DA1F2]/30' }] : []),
    ...(githubUrl ? [{ url: githubUrl, icon: Github, label: 'GitHub', color: 'text-gray-800 dark:text-gray-200', hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-800', hoverBorder: 'hover:border-gray-300 dark:hover:border-gray-600' }] : []),
    ...(websiteUrl ? [{ url: websiteUrl, icon: Globe, label: 'Website', color: 'text-purple-600 dark:text-purple-400', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-500/10', hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500/30' }] : []),
  ]

  if (socials.length === 0) return null

  return (
    <div className="flex justify-center gap-2.5">
      {socials.map((social, index) => {
        const Icon = social.icon
        return (
          <a
            key={index}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-11 h-11 rounded-xl bg-white/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 ${social.hoverBg} ${social.hoverBorder} backdrop-blur-sm transition-all duration-300 flex items-center justify-center hover:scale-110 hover:shadow-md active:scale-95`}
            aria-label={social.label}
          >
            <Icon className={`w-[18px] h-[18px] ${social.color}`} />
          </a>
        )
      })}
    </div>
  )
}
