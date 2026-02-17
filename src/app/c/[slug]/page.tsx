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
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/6 blur-[100px]" />
        <div className="absolute top-[40%] right-[-5%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
      </div>

      {/* Subtle grid pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 max-w-[420px] mx-auto px-6 py-16">
        {/* Company logo top */}
        <div className="card-fade-in card-delay-1 flex justify-center mb-12">
          <img
            src="/logo-dark.png"
            alt="FODI"
            className="h-10 w-auto opacity-70"
          />
        </div>

        {/* Hero */}
        <div className="card-fade-in card-delay-2">
          <CardHero
            firstName={card.user.firstName}
            lastName={card.user.lastName}
            avatarUrl={card.user.avatarUrl}
            jobTitle={card.jobTitle}
            cardBio={card.cardBio}
            department={card.department}
          />
        </div>

        {/* Actions */}
        <div className="mt-10 card-fade-in card-delay-3">
          <CardActions
            phone={card.user.phone}
            email={card.user.email}
            whatsappNumber={card.whatsappNumber}
            slug={slug}
          />
        </div>

        {/* Socials */}
        <div className="mt-8 card-fade-in card-delay-4">
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

        {/* Company */}
        {company && (
          <div className="mt-8 card-fade-in card-delay-5">
            <CardCompany company={company} />
          </div>
        )}

        {/* Booking */}
        {hasBooking && (
          <div className="mt-8 card-fade-in card-delay-5">
            <CardBooking slug={slug} duration={card.bookingDuration} />
          </div>
        )}

        {/* Wizards */}
        {card.showWizards && wizards.length > 0 && (
          <div className="mt-8 card-fade-in card-delay-6">
            <CardWizardLinks wizards={wizards} cardSlug={slug} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 card-fade-in card-delay-7 flex justify-center">
          <div className="flex items-center gap-2 text-[12px] text-white/25 tracking-wider uppercase">
            <div className="w-8 h-px bg-white/10" />
            <span>FODI Digital Card</span>
            <div className="w-8 h-px bg-white/10" />
          </div>
        </div>

        <CardViewTracker slug={slug} />
      </div>
    </div>
  )
}
