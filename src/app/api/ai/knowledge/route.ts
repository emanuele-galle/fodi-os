import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'

export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    requirePermission(auth.role, 'admin', 'read')

    const pages = await prisma.aiKnowledgePage.findMany({
      where: { brandSlug: brand.slug },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ success: true, data: pages })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/knowledge/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    requirePermission(auth.role, 'admin', 'admin')

    const { title, content, category, isActive, sortOrder } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Titolo e contenuto obbligatori' }, { status: 400 })
    }

    const page = await prisma.aiKnowledgePage.create({
      data: {
        brandSlug: brand.slug,
        title,
        content,
        category: category || 'OTHER',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    })

    return NextResponse.json({ success: true, data: page })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/knowledge/POST]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
