import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import CardHero from '@/components/card/CardHero'
import CardActions from '@/components/card/CardActions'
import CardSocials from '@/components/card/CardSocials'
import CardCompany from '@/components/card/CardCompany'
import CardWizardLinks from '@/components/card/CardWizardLinks'
import CardViewTracker from '@/components/card/CardViewTracker'
import CardBooking from '@/components/card/CardBooking'

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
          googleToken: { select: { id: true } },
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

  const hasBooking = card.showBooking && !!card.user.googleToken

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="max-w-md mx-auto px-5 py-14">
        {/* Hero - immediate */}
        <div className="animate-card-entrance animate-card-entrance-1">
          <CardHero
            firstName={card.user.firstName}
            lastName={card.user.lastName}
            avatarUrl={card.user.avatarUrl}
            jobTitle={card.jobTitle}
            cardBio={card.cardBio}
            department={card.department}
            logoUrl={company?.logoUrl}
          />
        </div>

        {/* Actions - stagger 2 */}
        <div className="mt-9 animate-card-entrance animate-card-entrance-2">
          <CardActions
            phone={card.user.phone}
            email={card.user.email}
            whatsappNumber={card.whatsappNumber}
            slug={slug}
          />
        </div>

        {/* Socials - stagger 3 */}
        <div className="mt-7 animate-card-entrance animate-card-entrance-3">
          <CardSocials
            linkedinUrl={card.linkedinUrl}
            instagramUrl={card.instagramUrl}
            twitterUrl={card.twitterUrl}
            githubUrl={card.githubUrl}
            websiteUrl={card.websiteUrl}
            facebookUrl={card.facebookUrl}
            tiktokUrl={card.tiktokUrl}
            youtubeUrl={card.youtubeUrl}
            telegramUrl={card.telegramUrl}
          />
        </div>

        {/* Company - stagger 4 */}
        {company && (
          <div className="mt-7 animate-card-entrance animate-card-entrance-4">
            <CardCompany company={company} />
          </div>
        )}

        {/* Booking - stagger 5 */}
        {hasBooking && (
          <div className="mt-7 animate-card-entrance animate-card-entrance-5">
            <CardBooking slug={slug} duration={card.bookingDuration} />
          </div>
        )}

        {/* Wizards - stagger 6 */}
        {card.showWizards && wizards.length > 0 && (
          <div className="mt-7 animate-card-entrance animate-card-entrance-6">
            <CardWizardLinks wizards={wizards} cardSlug={slug} />
          </div>
        )}

        <CardViewTracker slug={slug} />
      </div>
    </div>
  )
}
