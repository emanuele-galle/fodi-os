import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const [clientTags, taskTags] = await Promise.all([
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) as tag, COUNT(*) as count
        FROM "clients"
        WHERE array_length(tags, 1) > 0
        GROUP BY tag
      `,
      prisma.$queryRaw<{ tag: string; count: bigint }[]>`
        SELECT unnest(tags) as tag, COUNT(*) as count
        FROM "tasks"
        WHERE array_length(tags, 1) > 0
        GROUP BY tag
      `,
    ])

    const tagMap = new Map<string, { clientCount: number; taskCount: number }>()

    for (const { tag, count } of clientTags) {
      tagMap.set(tag, { clientCount: Number(count), taskCount: 0 })
    }
    for (const { tag, count } of taskTags) {
      const existing = tagMap.get(tag) || { clientCount: 0, taskCount: 0 }
      existing.taskCount = Number(count)
      tagMap.set(tag, existing)
    }

    const tags = Array.from(tagMap.entries()).map(([name, counts]) => ({
      name,
      ...counts,
      totalCount: counts.clientCount + counts.taskCount,
    }))

    return NextResponse.json({ success: true, data: tags })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/tags] GET', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { tag } = await request.json()
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ success: false, error: 'Tag richiesto' }, { status: 400 })
    }

    await Promise.all([
      prisma.$executeRaw`
        UPDATE "clients" SET tags = array_remove(tags, ${tag})
        WHERE tags @> ARRAY[${tag}]::text[]
      `,
      prisma.$executeRaw`
        UPDATE "tasks" SET tags = array_remove(tags, ${tag})
        WHERE tags @> ARRAY[${tag}]::text[]
      `,
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/tags] DELETE', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
