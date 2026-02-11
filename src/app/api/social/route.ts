import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createSocialPostSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { searchParams } = request.nextUrl
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where = {
      ...(platform && { platform }),
      ...(status && { status }),
      ...((from || to) && {
        scheduledAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    }

    const items = await prisma.socialPost.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    const body = await request.json()
    const parsed = createSocialPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { platform, content, mediaUrls, scheduledAt, status } = parsed.data

    const post = await prisma.socialPost.create({
      data: {
        platform,
        content,
        mediaUrls: mediaUrls || [],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: status || 'draft',
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
