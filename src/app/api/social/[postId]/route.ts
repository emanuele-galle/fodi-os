import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateSocialPostSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    const { postId } = await params
    const body = await request.json()
    const parsed = updateSocialPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { content, scheduledAt, status, mediaUrls } = parsed.data

    const data: Record<string, unknown> = {}
    if (content !== undefined) data.content = content
    if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (mediaUrls !== undefined) data.mediaUrls = mediaUrls
    if (status !== undefined) {
      data.status = status
      if (status === 'published') {
        data.publishedAt = new Date()
      }
    }

    const post = await prisma.socialPost.update({
      where: { id: postId },
      data,
    })

    return NextResponse.json(post)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'delete')

    const { postId } = await params

    const post = await prisma.socialPost.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft posts can be deleted' }, { status: 400 })
    }

    await prisma.socialPost.delete({ where: { id: postId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
