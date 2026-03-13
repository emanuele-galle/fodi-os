import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { generateClientBriefing } from '@/lib/crm/ai-suggestions'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const briefing = await generateClientBriefing(clientId)

    return NextResponse.json({ success: true, briefing })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/briefing/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione del briefing' }, { status: 500 })
  }
}
