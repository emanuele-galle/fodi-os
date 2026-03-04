import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { broadcastDataChanged } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

const renameSchema = z.object({
  oldName: z.string().min(1).max(100),
  newName: z.string().min(1).max(100),
})

export async function PATCH(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const parsed = renameSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'oldName e newName richiesti' }, { status: 400 })
    }
    const { oldName, newName } = parsed.data

    if (oldName === newName) {
      return NextResponse.json({ success: false, error: 'I nomi sono uguali' }, { status: 400 })
    }

    await Promise.all([
      prisma.$executeRaw`
        UPDATE "clients"
        SET tags = array_append(array_remove(tags, ${oldName}), ${newName})
        WHERE tags @> ARRAY[${oldName}]::text[]
        AND NOT (tags @> ARRAY[${newName}]::text[])
      `,
      prisma.$executeRaw`
        UPDATE "clients"
        SET tags = array_remove(tags, ${oldName})
        WHERE tags @> ARRAY[${oldName}]::text[]
        AND tags @> ARRAY[${newName}]::text[]
      `,
      prisma.$executeRaw`
        UPDATE "tasks"
        SET tags = array_append(array_remove(tags, ${oldName}), ${newName})
        WHERE tags @> ARRAY[${oldName}]::text[]
        AND NOT (tags @> ARRAY[${newName}]::text[])
      `,
      prisma.$executeRaw`
        UPDATE "tasks"
        SET tags = array_remove(tags, ${oldName})
        WHERE tags @> ARRAY[${oldName}]::text[]
        AND tags @> ARRAY[${newName}]::text[]
      `,
    ])

    broadcastDataChanged('client')
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/tags/rename]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
