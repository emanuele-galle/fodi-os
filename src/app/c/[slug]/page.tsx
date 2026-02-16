import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import CardHero from '@/components/card/CardHero'
import CardActions from '@/components/card/CardActions'
import CardSocials from '@/components/card/CardSocials'
import CardCompany from '@/components/card/CardCompany'
import CardWizardLinks from '@/components/card/CardWizardLinks'
import CardViewTracker from '@/components/card/CardViewTracker'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
        }
      }
    }
  })

  if (!card || !card.isEnabled) {
    return {
      title: 'Card non trovata',
    }
  }

  const fullName = `${card.user.firstName} ${card.user.lastName}`
  const title = card.jobTitle
    ? `${fullName} - ${card.jobTitle} | FODI`
    : `${fullName} | FODI`

  const description = card.cardBio || `Biglietto da visita digitale di ${fullName}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: card.user.avatarUrl ? [card.user.avatarUrl] : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params

  const card = await prisma.digitalCard.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
        }
      }
    }
  })

  if (!card || !card.isEnabled) {
    notFound()
  }

  // Fetch company profile
  const company = await prisma.companyProfile.findFirst()

  // Fetch published wizards if showWizards is enabled
  const wizards = card.showWizards
    ? await prisma.wizardTemplate.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
        },
        orderBy: { name: 'asc' }
      })
    : []

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6 animate-fade-in">
      <CardHero
        firstName={card.user.firstName}
        lastName={card.user.lastName}
        avatarUrl={card.user.avatarUrl}
        jobTitle={card.jobTitle}
        cardBio={card.cardBio}
        department={card.department}
      />

      <CardActions
        phone={card.user.phone}
        email={card.user.email}
        whatsappNumber={card.whatsappNumber}
        slug={slug}
      />

      <CardSocials
        linkedinUrl={card.linkedinUrl}
        instagramUrl={card.instagramUrl}
        twitterUrl={card.twitterUrl}
        githubUrl={card.githubUrl}
        websiteUrl={card.websiteUrl}
      />

      {company && <CardCompany company={company} />}

      {card.showWizards && wizards.length > 0 && (
        <CardWizardLinks wizards={wizards} cardSlug={slug} />
      )}

      <CardViewTracker slug={slug} />
    </div>
  )
}
