import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { broadcastDataChanged } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

const mergeSchema = z.object({
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const parsed = mergeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'source e target richiesti' }, { status: 400 })
    }
    const { source, target } = parsed.data

    if (source === target) {
      return NextResponse.json({ success: false, error: 'Source e target sono uguali' }, { status: 400 })
    }

    await Promise.all([
      prisma.$executeRaw`
        UPDATE "clients"
        SET tags = array_append(array_remove(tags, ${source}), ${target})
        WHERE tags @> ARRAY[${source}]::text[]
        AND NOT (tags @> ARRAY[${target}]::text[])
      `,
      prisma.$executeRaw`
        UPDATE "clients"
        SET tags = array_remove(tags, ${source})
        WHERE tags @> ARRAY[${source}]::text[]
        AND tags @> ARRAY[${target}]::text[]
      `,
      prisma.$executeRaw`
        UPDATE "tasks"
        SET tags = array_append(array_remove(tags, ${source}), ${target})
        WHERE tags @> ARRAY[${source}]::text[]
        AND NOT (tags @> ARRAY[${target}]::text[])
      `,
      prisma.$executeRaw`
        UPDATE "tasks"
        SET tags = array_remove(tags, ${source})
        WHERE tags @> ARRAY[${source}]::text[]
        AND tags @> ARRAY[${target}]::text[]
      `,
    ])

    broadcastDataChanged('client')
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/tags/merge]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
