'use client'

import { Phone, Mail, MessageCircle, UserPlus } from 'lucide-react'
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
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/25',
      external: false,
    }] : []),
    ...(email ? [{
      href: `mailto:${email}`,
      icon: Mail,
      label: 'Email',
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/25',
      external: false,
    }] : []),
    ...(whatsappNumber ? [{
      href: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`,
      icon: MessageCircle,
      label: 'WhatsApp',
      gradient: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/25',
      external: true,
    }] : []),
  ]

  return (
    <div className="space-y-3">
      {/* Contact buttons */}
      <div className={`grid gap-2.5 ${actions.length >= 3 ? 'grid-cols-3' : actions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <a
              key={index}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className="group flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} group-hover:shadow-xl transition-shadow`}>
                <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{action.label}</span>
            </a>
          )
        })}
      </div>

      {/* Save contact CTA */}
      <button
        onClick={handleSaveContact}
        disabled={downloading}
        className="relative w-full overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        <UserPlus className="w-[18px] h-[18px] relative" strokeWidth={2.2} />
        <span className="relative">{downloading ? 'Download in corso...' : 'Salva Contatto'}</span>
      </button>
    </div>
  )
}
