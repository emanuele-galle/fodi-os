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
  type Social = { url: string; icon: typeof Linkedin; label: string; color: string; hoverBg: string }
  const socials: Social[] = [
    ...(linkedinUrl ? [{ url: linkedinUrl, icon: Linkedin, label: 'LinkedIn', color: 'text-[#0A66C2]', hoverBg: 'hover:bg-[#0A66C2]/10' }] : []),
    ...(instagramUrl ? [{ url: instagramUrl, icon: Instagram, label: 'Instagram', color: 'text-[#E4405F]', hoverBg: 'hover:bg-[#E4405F]/10' }] : []),
    ...(twitterUrl ? [{ url: twitterUrl, icon: Twitter, label: 'Twitter', color: 'text-[#1DA1F2]', hoverBg: 'hover:bg-[#1DA1F2]/10' }] : []),
    ...(githubUrl ? [{ url: githubUrl, icon: Github, label: 'GitHub', color: 'text-gray-800 dark:text-gray-200', hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-800' }] : []),
    ...(websiteUrl ? [{ url: websiteUrl, icon: Globe, label: 'Website', color: 'text-purple-600 dark:text-purple-400', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-500/10' }] : []),
  ]

  if (socials.length === 0) return null

  return (
    <div className="flex justify-center gap-2">
      {socials.map((social, index) => {
        const Icon = social.icon
        return (
          <a
            key={index}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-11 h-11 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 ${social.hoverBg} transition-all flex items-center justify-center group hover:scale-110 hover:shadow-md active:scale-95`}
            aria-label={social.label}
          >
            <Icon className={`w-[18px] h-[18px] ${social.color}`} />
          </a>
        )
      })}
    </div>
  )
}
