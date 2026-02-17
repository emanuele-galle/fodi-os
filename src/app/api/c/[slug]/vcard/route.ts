import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVCard } from '@/lib/vcard'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
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
            role: true
          }
        }
      }
    })

    if (!card || !card.isEnabled) {
      return NextResponse.json(
        { error: 'Card non trovata' },
        { status: 404 }
      )
    }

    const company = await prisma.companyProfile.findFirst()

    const vcard = generateVCard({
      firstName: card.user.firstName,
      lastName: card.user.lastName,
      email: card.user.email,
      phone: card.user.phone,
      jobTitle: card.jobTitle,
      company: company?.ragioneSociale || 'Fodi SRL',
      bio: card.cardBio,
      linkedinUrl: card.linkedinUrl,
      instagramUrl: card.instagramUrl,
      twitterUrl: card.twitterUrl,
      githubUrl: card.githubUrl,
      websiteUrl: card.websiteUrl || company?.siteUrl,
      whatsappNumber: card.whatsappNumber,
      facebookUrl: card.facebookUrl,
      tiktokUrl: card.tiktokUrl,
      youtubeUrl: card.youtubeUrl,
      telegramUrl: card.telegramUrl,
    })

    const filename = `${card.user.firstName}_${card.user.lastName}.vcf`

    return new NextResponse(vcard, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (e) {
    console.error('[vcard/GET]', e)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}
