import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

/**
 * DELETE /api/assets/cleanup
 * Removes legacy assets with invalid blob: URLs from the database.
 * Only accessible by ADMIN users.
 */
export async function DELETE(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo gli admin possono eseguire il cleanup' }, { status: 403 })
    }

    // Find assets with blob: URLs (legacy broken uploads)
    const blobAssets = await prisma.asset.findMany({
      where: {
        fileUrl: { startsWith: 'blob:' },
      },
      select: { id: true, fileName: true, fileUrl: true },
    })

    if (blobAssets.length === 0) {
      return NextResponse.json({ message: 'Nessun asset legacy da pulire', deleted: 0 })
    }

    // Delete them
    const result = await prisma.asset.deleteMany({
      where: {
        fileUrl: { startsWith: 'blob:' },
      },
    })

    return NextResponse.json({
      message: `Rimossi ${result.count} asset con URL blob: non validi`,
      deleted: result.count,
      details: blobAssets.map((a) => ({ id: a.id, fileName: a.fileName })),
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets/cleanup]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
