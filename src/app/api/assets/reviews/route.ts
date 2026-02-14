import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role, ReviewStatus } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    const reviews = await prisma.assetReview.findMany({
      where: status ? { status: status as ReviewStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        asset: { select: { id: true, fileName: true, fileUrl: true, mimeType: true, category: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })

    return NextResponse.json({ items: reviews, total: reviews.length })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets/reviews]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
