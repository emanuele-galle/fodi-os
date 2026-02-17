import Image from 'next/image'
import Link from 'next/link'

interface WizardSuccessProps {
  message?: string | null
  logoUrl?: string | null
  companyName?: string
  cardSlug: string
  phone?: string | null
}

export function WizardSuccess({ message, logoUrl, companyName, cardSlug, phone }: WizardSuccessProps) {
  const defaultMessage = 'Il tuo messaggio è stato inviato con successo. Ti ricontatteremo al più presto.'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Logo */}
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={companyName || 'FODI'}
          width={64}
          height={64}
          className="h-16 w-auto object-contain mb-6"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-6">
          F
        </div>
      )}

      {/* Animated check */}
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-scale-in">
        <svg
          className="w-10 h-10 text-green-500"
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
      <h2 className="text-2xl font-bold text-foreground mb-3">
        Grazie!
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        {message || defaultMessage}
      </p>

      {/* CTAs */}
      <div className="w-full space-y-3 max-w-xs">
        {/* Primary CTA - Back to profile */}
        <Link
          href={`/c/${cardSlug}`}
          className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/30 hover:brightness-110 active:scale-[0.99]"
        >
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <svg className="w-[18px] h-[18px] relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="relative">Torna al profilo</span>
        </Link>

        {/* Secondary CTA - Call now */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-medium text-muted-foreground bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-border/30 hover:text-foreground hover:border-border/60 transition-all"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Chiama ora
          </a>
        )}
      </div>
    </div>
  )
}
