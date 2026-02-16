import Image from 'next/image'
import { Building2, Globe, Mail, Phone } from 'lucide-react'

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
    <div className="border rounded-xl p-6 bg-card space-y-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
      {/* Company header */}
      <div className="flex items-center gap-4">
        {company.logoUrl ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={company.logoUrl}
              alt={company.ragioneSociale}
              fill
              className="object-contain p-1"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">
            {company.ragioneSociale}
          </h3>
          {company.siteUrl && (
            <a
              href={company.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span className="truncate">Sito Web</span>
            </a>
          )}
        </div>
      </div>

      {/* Company contact info */}
      {(company.email || company.telefono) && (
        <div className="space-y-2 pt-2 border-t">
          {company.email && (
            <a
              href={`mailto:${company.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{company.email}</span>
            </a>
          )}
          {company.telefono && (
            <a
              href={`tel:${company.telefono}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>{company.telefono}</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
