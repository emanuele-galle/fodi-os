import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { updateClientHealthScore, generateNextActions } from '@/lib/crm/health-score'
import { prisma } from '@/lib/prisma'
import type { Role, Prisma } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params

    // Check if score exists and is recent (<24h)
    const existing = await prisma.clientHealthScore.findUnique({
      where: { clientId },
    })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const needsRecalc = !existing || existing.lastCalculatedAt < twentyFourHoursAgo

    if (needsRecalc) {
      const breakdown = await updateClientHealthScore(clientId)
      const lastInteraction = await prisma.interaction.findFirst({
        where: { clientId },
        orderBy: { date: 'desc' },
        select: { date: true },
      })
      const nextActions = generateNextActions(breakdown, lastInteraction?.date ?? null)

      // Update next actions
      await prisma.clientHealthScore.update({
        where: { clientId },
        data: { nextActions: nextActions as unknown as Prisma.InputJsonValue },
      })

      const updated = await prisma.clientHealthScore.findUnique({ where: { clientId } })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: true, data: existing })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/health/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nel calcolo health score' }, { status: 500 })
  }
}
