import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'

export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const config = await prisma.aiAgentConfig.findUnique({
      where: { brandSlug: brand.slug },
      select: { welcomeMessage: true, name: true },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (err) {
    console.error('[ai/config/public/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
