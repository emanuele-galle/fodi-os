import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'kb', 'read')

    const [versions, comments] = await Promise.all([
      prisma.wikiPageVersion.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          page: { select: { id: true, title: true } },
          editor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.comment.findMany({
        where: { wikiPageId: { not: null } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          wikiPage: { select: { id: true, title: true } },
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
    ])

    const activity = [
      ...versions.map((v) => ({
        type: 'edit' as const,
        id: v.id,
        pageId: v.page.id,
        pageTitle: v.page.title,
        user: v.editor,
        content: v.changeNote || `Versione ${v.version}`,
        createdAt: v.createdAt,
      })),
      ...comments.map((c) => ({
        type: 'comment' as const,
        id: c.id,
        pageId: c.wikiPage!.id,
        pageTitle: c.wikiPage!.title,
        user: c.author,
        content: c.content,
        createdAt: c.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    return NextResponse.json({ items: activity })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki/activity]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
