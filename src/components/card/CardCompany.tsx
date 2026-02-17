import Image from 'next/image'
import { Building2, ArrowUpRight } from 'lucide-react'

type CardCompanyProps = {
  company: {
    ragioneSociale: string
    logoUrl?: string | null
    siteUrl?: string | null
    email?: string | null
    telefono?: string | null
  } | null
}

export default function CardCompany({ company }: CardCompanyProps) {
  if (!company) return null

  const content = (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-center gap-4">
        {company.logoUrl ? (
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0 border border-white/[0.06]">
            <Image
              src={company.logoUrl}
              alt={company.ragioneSociale}
              fill
              className="object-contain p-1.5"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
            <Building2 className="w-4 h-4 text-white/30" strokeWidth={1.5} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[13px] text-white/70">
            {company.ragioneSociale}
          </h3>
          {company.siteUrl && (
            <span className="text-[11px] text-white/25">
              {company.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          )}
        </div>

        {company.siteUrl && (
          <ArrowUpRight className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors flex-shrink-0" strokeWidth={1.5} />
        )}
      </div>
    </div>
  )

  if (company.siteUrl) {
    return (
      <a
        href={company.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-all duration-300 hover:scale-[1.01]"
      >
        {content}
      </a>
    )
  }

  return content
}
