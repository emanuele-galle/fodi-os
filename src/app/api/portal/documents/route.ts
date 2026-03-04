import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    const documents = await prisma.document.findMany({
      where: {
        clientId: client.id,
        isClientVisible: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ items: documents, total: documents.length })
  } catch (e) {
    return handlePortalError(e, 'portal/documents')
  }
}
