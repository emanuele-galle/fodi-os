import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createReviewCommentSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { reviewId } = await params

    const comments = await prisma.reviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items: comments, total: comments.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'content', 'write')

    const { reviewId } = await params
    const body = await request.json()
    const parsed = createReviewCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { content, timestamp } = parsed.data

    const review = await prisma.assetReview.findUnique({ where: { id: reviewId } })
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const comment = await prisma.reviewComment.create({
      data: {
        reviewId,
        authorId: userId,
        content,
        timestamp: timestamp ?? null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
