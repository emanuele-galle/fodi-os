import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')

    const wizards = await prisma.wizardTemplate.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        showProgressBar: true,
        _count: { select: { steps: true } },
      },
    })

    return NextResponse.json(wizards)
  } catch (e) {
    console.error('[portal/wizards]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
