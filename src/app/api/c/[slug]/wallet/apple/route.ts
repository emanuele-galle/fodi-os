import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApplePass } from '@/lib/apple-wallet'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!rateLimit(`wallet-apple:${ip}`, 10, 60000)) {
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
          }
        }
      }
    })

    if (!card || !card.isEnabled) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    const company = await prisma.companyProfile.findFirst()

    const passBuffer = await generateApplePass({
      slug: card.slug,
      firstName: card.user.firstName,
      lastName: card.user.lastName,
      jobTitle: card.jobTitle,
      email: card.user.email,
      phone: card.user.phone,
      company: company?.ragioneSociale || 'Fodi SRL',
      cardBio: card.cardBio,
    })

    return new NextResponse(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${slug}.pkpass"`,
      }
    })
  } catch (e) {
    console.error('[wallet/apple/GET]', e)
    return NextResponse.json({ error: 'Errore nella generazione del pass' }, { status: 500 })
  }
}
