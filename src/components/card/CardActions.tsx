'use client'

import { Phone, Mail, MessageCircle, Download } from 'lucide-react'
import { useState } from 'react'

type CardActionsProps = {
  phone?: string | null
  email?: string | null
  whatsappNumber?: string | null
  slug: string
}

export default function CardActions({
  phone,
  email,
  whatsappNumber,
  slug,
}: CardActionsProps) {
  const [downloading, setDownloading] = useState(false)

  const handleSaveContact = async () => {
    if (downloading) return

    setDownloading(true)
    try {
      const response = await fetch(`/api/c/${slug}/vcard`)
      if (!response.ok) throw new Error('Failed to download vCard')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}.vcf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading vCard:', error)
    } finally {
      setDownloading(false)
    }
  }

  type LinkAction = { type: 'link'; href: string; icon: typeof Phone; label: string; external: boolean }
  type ButtonAction = { type: 'button'; icon: typeof Download; label: string; onClick: () => void; disabled?: boolean }
  type Action = LinkAction | ButtonAction

  const actions: Action[] = [
    ...(phone ? [{ type: 'link' as const, href: `tel:${phone}`, icon: Phone, label: 'Chiama', external: false }] : []),
    ...(email ? [{ type: 'link' as const, href: `mailto:${email}`, icon: Mail, label: 'Email', external: false }] : []),
    ...(whatsappNumber ? [{ type: 'link' as const, href: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`, icon: MessageCircle, label: 'WhatsApp', external: true }] : []),
    { type: 'button' as const, icon: Download, label: downloading ? 'Download...' : 'Salva Contatto', onClick: handleSaveContact, disabled: downloading },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
      {actions.map((action, index) => {
        const Icon = action.icon

        if (action.type === 'button') {
          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex flex-col items-center justify-center gap-2 min-h-[80px] rounded-xl bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-4"
            >
              <Icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          )
        }

        return (
          <a
            key={index}
            href={action.href}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
            className="flex flex-col items-center justify-center gap-2 min-h-[80px] rounded-xl bg-secondary hover:bg-secondary/80 transition-colors p-4"
          >
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{action.label}</span>
          </a>
        )
      })}
    </div>
  )
}
