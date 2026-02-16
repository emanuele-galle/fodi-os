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
  type Social = { url: string; icon: typeof Linkedin; label: string }
  const socials: Social[] = [
    ...(linkedinUrl ? [{ url: linkedinUrl, icon: Linkedin, label: 'LinkedIn' }] : []),
    ...(instagramUrl ? [{ url: instagramUrl, icon: Instagram, label: 'Instagram' }] : []),
    ...(twitterUrl ? [{ url: twitterUrl, icon: Twitter, label: 'Twitter' }] : []),
    ...(githubUrl ? [{ url: githubUrl, icon: Github, label: 'GitHub' }] : []),
    ...(websiteUrl ? [{ url: websiteUrl, icon: Globe, label: 'Website' }] : []),
  ]

  if (socials.length === 0) return null

  return (
    <div className="flex justify-center gap-3 pt-2 animate-slide-up" style={{ animationDelay: '200ms' }}>
      {socials.map((social, index) => {
        const Icon = social.icon
        return (
          <a
            key={index}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center group"
            aria-label={social.label}
          >
            <Icon className="w-5 h-5" />
          </a>
        )
      })}
    </div>
  )
}
