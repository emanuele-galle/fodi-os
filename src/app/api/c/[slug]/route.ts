import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    let wizards: { id: string; name: string; slug: string; description: string | null; category: string }[] = []
    if (card.showWizards) {
      wizards = await prisma.wizardTemplate.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true
        },
        orderBy: { name: 'asc' }
      })
    }

    return NextResponse.json({
      success: true,
      data: { card, company, wizards }
    })
  } catch (e) {
    console.error('[card/GET]', e)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}
