import { brand } from '@/lib/branding'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { WizardForm } from '@/components/card/wizard/WizardForm'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string; wizardSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, wizardSlug } = await params

  const template = await prisma.wizardTemplate.findUnique({
    where: { slug: wizardSlug }
  })

  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: { user: { select: { firstName: true, lastName: true } } }
  })

  const name = card ? `${card.user.firstName} ${card.user.lastName}` : brand.slug.toUpperCase()
  const title = template?.name || 'Questionario'

  return {
    title: `${title} - ${name}`,
    description: template?.description || 'Compila il questionario per ricevere maggiori informazioni.'
  }
}

export default async function WizardPage({ params }: PageProps) {
  const { slug, wizardSlug } = await params

  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: { user: { select: { firstName: true, lastName: true, phone: true } } }
  })

  if (!card || !card.showWizards) {
    notFound()
  }

  const template = await prisma.wizardTemplate.findUnique({
    where: { slug: wizardSlug },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      }
    }
  })

  if (!template || template.status !== 'PUBLISHED') {
    notFound()
  }

  const company = await prisma.companyProfile.findFirst()

  const userName = `${card.user.firstName} ${card.user.lastName}`
  const companyName = company?.ragioneSociale || brand.slug.toUpperCase()
  const phone = card.user.phone || null

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 card-fade-in card-delay-1">
          <img
            src={brand.logo.dark}
            alt={companyName}
            className="h-9 w-auto opacity-60 mb-3"
          />
          <p className="text-[13px] text-white/30">
            {userName}
          </p>
        </div>

        {/* Back link */}
        <div className="mb-6 card-fade-in card-delay-2">
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center gap-2 text-[13px] text-white/35 hover:text-white/60 transition-colors px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Torna al profilo
          </Link>
        </div>

        {/* Wizard card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 card-fade-in card-delay-3">
          {/* Top accent */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

          <div className="mb-8">
            <h1 className="text-[22px] font-semibold text-white/90 mb-2">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-white/35 text-[13px] leading-relaxed">{template.description}</p>
            )}
          </div>

          <WizardForm
            template={template}
            cardSlug={slug}
            companyName={companyName}
            phone={phone}
          />
        </div>
      </div>
    </div>
  )
}
