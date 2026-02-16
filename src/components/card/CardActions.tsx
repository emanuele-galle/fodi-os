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

  const linkActions = [
    ...(phone ? [{
      href: `tel:${phone}`,
      icon: Phone,
      label: 'Chiama',
      color: 'from-emerald-500 to-green-600',
      bgLight: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      external: false,
    }] : []),
    ...(email ? [{
      href: `mailto:${email}`,
      icon: Mail,
      label: 'Email',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      external: false,
    }] : []),
    ...(whatsappNumber ? [{
      href: `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`,
      icon: MessageCircle,
      label: 'WhatsApp',
      color: 'from-green-500 to-emerald-600',
      bgLight: 'bg-green-50 dark:bg-green-500/10',
      textColor: 'text-green-600 dark:text-green-400',
      external: true,
    }] : []),
  ]

  return (
    <div className="space-y-3">
      {/* Contact buttons row */}
      <div className={`grid gap-3 ${linkActions.length >= 3 ? 'grid-cols-3' : linkActions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {linkActions.map((action, index) => {
          const Icon = action.icon
          return (
            <a
              key={index}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className={`flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-2xl ${action.bgLight} border border-transparent hover:border-current/10 transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg shadow-current/20`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-semibold ${action.textColor}`}>{action.label}</span>
            </a>
          )
        })}
      </div>

      {/* Save contact - full width CTA */}
      <button
        onClick={handleSaveContact}
        disabled={downloading}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4.5 h-4.5" />
        {downloading ? 'Download in corso...' : 'Salva Contatto'}
      </button>
    </div>
  )
}
