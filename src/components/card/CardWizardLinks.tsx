'use client'

import Link from 'next/link'
import { Sparkles, Send } from 'lucide-react'

type Wizard = {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
}

type CardWizardLinksProps = {
  wizards: Wizard[]
  cardSlug: string
}

export default function CardWizardLinks({ wizards, cardSlug }: CardWizardLinksProps) {
  if (wizards.length === 0) return null

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400/70" strokeWidth={1.8} />
          <h2 className="text-[16px] font-medium text-white/70 tracking-wide">I nostri servizi</h2>
        </div>
        <p className="text-[13px] text-white/40">
          Scopri cosa possiamo fare per te
        </p>
      </div>

      {/* Wizard cards */}
      <div className="space-y-3">
        {wizards.map((wizard, index) => (
          <Link
            key={wizard.id}
            href={`/c/${cardSlug}/wizard/${wizard.slug}`}
            className="block group"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.1]">
              {/* Top accent */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

              {/* Content */}
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <h3 className="font-medium text-[15px] text-white/85 group-hover:text-white transition-colors">
                    {wizard.name}
                  </h3>
                  {wizard.description && (
                    <p className="text-[13px] leading-relaxed text-white/40 line-clamp-2 group-hover:text-white/50 transition-colors">
                      {wizard.description}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/8 border border-purple-500/10 flex items-center justify-center transition-all duration-300 group-hover:bg-purple-500/15 group-hover:border-purple-500/20">
                  <Send className="w-4 h-4 text-purple-400/60 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" strokeWidth={1.6} />
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/[0.02] to-indigo-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
