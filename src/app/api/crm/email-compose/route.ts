import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { composeEmail } from '@/lib/crm/email-composer'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const { clientId, contactId, scenario, customPrompt } = body

    if (!clientId || !scenario) {
      return NextResponse.json({ success: false, error: 'clientId e scenario sono obbligatori' }, { status: 400 })
    }

    const result = await composeEmail({ clientId, contactId, scenario, customPrompt })
    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/email-compose]', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Errore nella composizione email' },
      { status: 500 },
    )
  }
}
