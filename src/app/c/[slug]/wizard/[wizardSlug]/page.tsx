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
    include: { user: { select: { firstName: true, lastName: true } } }
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

  const userName = `${card.user.firstName} ${card.user.lastName}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href={`/c/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Torna al profilo di {userName}
        </Link>

        {/* Wizard card */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {template.name}
            </h1>
            {template.description && (
              <p className="text-muted text-sm md:text-base">{template.description}</p>
            )}
          </div>

          <WizardForm template={template} cardSlug={slug} />
        </div>
      </div>
    </div>
  )
}
