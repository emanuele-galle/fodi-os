'use client'

import { Phone, Mail, MessageCircle, UserPlus, Download } from 'lucide-react'
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

  const actions = [
    ...(phone ? [{
      href: `tel:${phone}`,
      icon: Phone,
      label: 'Chiama',
      color: '#10B981',
      external: false,
    }] : []),
    ...(email ? [{
      href: `mailto:${email}`,
      icon: Mail,
      label: 'Email',
      color: '#3B82F6',
      external: false,
    }] : []),
    ...(whatsappNumber ? [{
      href: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`,
      icon: MessageCircle,
      label: 'WhatsApp',
      color: '#25D366',
      external: true,
    }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* Action buttons row */}
      <div className={`grid gap-3 ${actions.length >= 3 ? 'grid-cols-3' : actions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <a
              key={index}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className="group relative flex flex-col items-center gap-3 py-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.1] active:scale-[0.97]"
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: `inset 0 0 30px ${action.color}08, 0 0 20px ${action.color}05` }}
              />
              <div
                className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: action.color }} strokeWidth={1.8} />
              </div>
              <span className="relative text-[11px] font-medium text-white/40 tracking-wide uppercase">{action.label}</span>
            </a>
          )
        })}
      </div>

      {/* Save contact CTA */}
      <button
        onClick={handleSaveContact}
        disabled={downloading}
        className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/90 font-medium text-[13px] tracking-wide transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.12] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {/* Shine sweep */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        {downloading ? (
          <Download className="w-4 h-4 relative animate-bounce" strokeWidth={1.8} />
        ) : (
          <UserPlus className="w-4 h-4 relative" strokeWidth={1.8} />
        )}
        <span className="relative">{downloading ? 'Download...' : 'Salva Contatto'}</span>
      </button>
    </div>
  )
}
