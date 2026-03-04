import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    await requirePortalClient(request)

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
    return handlePortalError(e, 'portal/wizards')
  }
}
