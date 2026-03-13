import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { generateCommunicationPlan } from '@/lib/crm/communication-planner'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId e obbligatorio' }, { status: 400 })
    }

    const plan = await generateCommunicationPlan(clientId)
    return NextResponse.json({ success: true, data: plan })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/communication-plan]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione del piano' }, { status: 500 })
  }
}
