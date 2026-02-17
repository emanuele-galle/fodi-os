import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

  const name = card ? `${card.user.firstName} ${card.user.lastName}` : 'FODI'
  const title = template?.name || 'Questionario'

  return {
    title: `${title} - ${name}`,
    description: template?.description || 'Compila il questionario per ricevere maggiori informazioni.'
  }
}

export default async function WizardPage({ params }: PageProps) {
  const { slug, wizardSlug } = await params

  // Fetch card to verify it exists and has showWizards=true
  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: { user: { select: { firstName: true, lastName: true, phone: true } } }
  })

  if (!card || !card.showWizards) {
    notFound()
  }

  // Fetch wizard template with steps and fields
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

  // Fetch company profile for logo
  const company = await prisma.companyProfile.findFirst()

  const userName = `${card.user.firstName} ${card.user.lastName}`
  const logoUrl = company?.logoUrl || null
  const companyName = company?.ragioneSociale || 'FODI'
  const phone = card.user.phone || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-500/5 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header with logo */}
        <div className="flex flex-col items-center mb-6 animate-card-entrance animate-card-entrance-1">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={companyName}
              width={56}
              height={56}
              className="h-14 w-auto object-contain mb-2"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-2">
              F
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {userName}
          </p>
        </div>

        {/* Back link - pill glassmorphism */}
        <div className="mb-6 animate-card-entrance animate-card-entrance-2">
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-border/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Torna al profilo
          </Link>
        </div>

        {/* Wizard card */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl p-6 animate-card-entrance animate-card-entrance-3">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-muted-foreground text-sm">{template.description}</p>
            )}
          </div>

          <WizardForm
            template={template}
            cardSlug={slug}
            logoUrl={logoUrl}
            companyName={companyName}
            phone={phone}
          />
        </div>
      </div>
    </div>
  )
}
