import Image from 'next/image'
import { Building2, ExternalLink } from 'lucide-react'

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-5">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />

      <div className="flex items-center gap-4">
        {company.logoUrl ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm">
            <Image
              src={company.logoUrl}
              alt={company.ragioneSociale}
              fill
              className="object-contain p-1.5"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {company.ragioneSociale}
          </h3>
          {company.siteUrl && (
            <a
              href={company.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              {company.siteUrl.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
