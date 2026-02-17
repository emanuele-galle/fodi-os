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
    <div className="space-y-5 pt-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
      {/* Section header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">I nostri servizi</h2>
        </div>
        <p className="text-sm text-muted-foreground">
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
            style={{ animationDelay: `${500 + index * 50}ms` }}
          >
            <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-purple-500/5 p-5 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
              {/* Content */}
              <div className="relative space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                      {wizard.name}
                    </h3>
                    {wizard.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {wizard.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-600/10 to-indigo-600/10 group-hover:from-purple-600/20 group-hover:to-indigo-600/20 flex items-center justify-center transition-all">
                    <Send className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
