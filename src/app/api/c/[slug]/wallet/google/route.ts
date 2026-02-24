import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateGoogleWalletUrl } from '@/lib/google-wallet'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'
import { brand } from '@/lib/branding'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`wallet-google:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra un minuto.' }, { status: 429 })
    }

    const { slug } = await params

    const card = await prisma.digitalCard.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          }
        }
      }
    })

    if (!card || !card.isEnabled) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()

    const url = await generateGoogleWalletUrl({
      slug: card.slug,
      firstName: card.user.firstName,
      lastName: card.user.lastName,
      jobTitle: card.jobTitle,
      email: card.user.email,
      phone: card.user.phone,
      company: company?.ragioneSociale || brand.company,
      cardBio: card.cardBio,
      avatarUrl: card.user.avatarUrl,
    })

    return NextResponse.json({ url })
  } catch (e) {
    console.error('[wallet/google/GET]', e)
    return NextResponse.json({ error: 'Errore nella generazione del pass' }, { status: 500 })
  }
}
