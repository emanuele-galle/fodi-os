import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createReviewSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { assetId } = await params

    const reviews = await prisma.assetReview.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      include: {
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
    console.error('[assets/:assetId/reviews]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    const { assetId } = await params
    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { dueDate } = parsed.data

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    const review = await prisma.assetReview.create({
      data: {
        assetId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        comments: true,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets/:assetId/reviews]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
