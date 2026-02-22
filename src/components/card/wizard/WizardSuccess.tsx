import { brandClient } from '@/lib/branding-client'
import Link from 'next/link'

interface WizardSuccessProps {
  message?: string | null
  companyName?: string
  cardSlug: string
  phone?: string | null
}

export function WizardSuccess({ message, companyName, cardSlug, phone }: WizardSuccessProps) {
  const defaultMessage = 'Il tuo messaggio è stato inviato con successo. Ti ricontatteremo al più presto.'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Logo */}
      <img
        src={brandClient.logo.dark}
        alt={companyName || brandClient.slug.toUpperCase()}
        className="h-10 w-auto opacity-50 mb-8"
      />

      {/* Animated check */}
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-6 animate-scale-in">
        <svg
          className="w-10 h-10 text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Success message */}
      <h2 className="text-[22px] font-semibold text-white/90 mb-3">
        Grazie!
      </h2>
      <p className="text-[13px] text-white/35 max-w-xs mb-10 leading-relaxed">
        {message || defaultMessage}
      </p>

      {/* CTAs */}
      <div className="w-full space-y-3 max-w-xs">
        {/* Primary CTA */}
        <Link
          href={`/c/${cardSlug}`}
          className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-medium text-[14px] transition-all duration-300 hover:brightness-110 active:scale-[0.99]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="relative">Torna al profilo</span>
        </Link>

        {/* Secondary CTA - Call now */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[13px] font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.05] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Chiama ora
          </a>
        )}
      </div>
    </div>
  )
}
