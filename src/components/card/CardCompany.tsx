import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { brandClient } from '@/lib/branding-client'

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
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5">
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-center gap-4">
        {/* Always use the dark logo for this dark card context */}
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white/[0.05] flex-shrink-0 border border-white/[0.06]">
          {brandClient.logo.dark.endsWith('.svg') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandClient.logo.dark} alt={company.ragioneSociale} className="w-full h-full object-contain p-1.5" />
          ) : (
            <Image src={brandClient.logo.dark} alt={company.ragioneSociale} fill className="object-contain p-1.5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[15px] text-white/80">
            {company.ragioneSociale}
          </h3>
          {company.siteUrl && (
            <span className="text-[13px] text-white/40">
              {company.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          )}
        </div>

        {company.siteUrl && (
          <ArrowUpRight className="w-4 h-4 text-white/15 group-hover:text-white/35 transition-colors flex-shrink-0" strokeWidth={1.5} />
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
