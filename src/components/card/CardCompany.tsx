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
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm p-4">
      {/* Top accent */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="flex items-center gap-3.5">
        {company.logoUrl ? (
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-700/50">
            <Image
              src={company.logoUrl}
              alt={company.ragioneSociale}
              fill
              className="object-contain p-1.5"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-purple-500/8 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4.5 h-4.5 text-purple-500" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13px] text-gray-900 dark:text-white">
            {company.ragioneSociale}
          </h3>
          {company.siteUrl && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {company.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          )}
        </div>

        {company.siteUrl && (
          <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
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
        className="block hover:scale-[1.01] transition-transform duration-200"
      >
        {content}
      </a>
    )
  }

  return content
}
