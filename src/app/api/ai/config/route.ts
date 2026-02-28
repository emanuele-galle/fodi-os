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

    const config = await prisma.aiAgentConfig.findUnique({
      where: { brandSlug: brand.slug },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/config/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    requirePermission(auth.role, 'admin', 'admin')

    const body = await request.json()
    const { name, systemPrompt, model, temperature, maxTokens, enabledTools, welcomeMessage, isActive } = body

    const config = await prisma.aiAgentConfig.upsert({
      where: { brandSlug: brand.slug },
      create: {
        brandSlug: brand.slug,
        name: name || 'Assistente AI',
        systemPrompt: systemPrompt || null,
        model: model || 'claude-sonnet-4-6',
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens || 4096,
        enabledTools: enabledTools || [],
        welcomeMessage: welcomeMessage || null,
        isActive: isActive ?? true,
      },
      update: {
        ...(name !== undefined && { name }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(enabledTools !== undefined && { enabledTools }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    console.error('[ai/config/PUT]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
