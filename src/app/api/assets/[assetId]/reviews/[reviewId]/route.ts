import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role, ReviewStatus } from '@/generated/prisma/client'

const VALID_STATUSES: ReviewStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assetId: string; reviewId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    const { reviewId } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status || !VALID_STATUSES.includes(status as ReviewStatus)) {
      return NextResponse.json({ error: 'Status non valido' }, { status: 400 })
    }

    const review = await prisma.assetReview.update({
      where: { id: reviewId },
      data: { status: status as ReviewStatus },
    })

    return NextResponse.json(review)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets/:assetId/reviews/:reviewId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
