import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    requirePermission(auth.role, 'admin', 'admin')

    const { id } = await params
    const { title, content, category, isActive, sortOrder } = await request.json()

    const page = await prisma.aiKnowledgePage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({ success: true, data: page })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/knowledge/PUT]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    requirePermission(auth.role, 'admin', 'admin')

    const { id } = await params

    await prisma.aiKnowledgePage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/knowledge/DELETE]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
