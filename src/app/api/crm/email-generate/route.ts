import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { generateEmail } from '@/lib/crm/email-generator'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const { clientId, scenario, customPrompt } = body

    if (!clientId || !scenario) {
      return NextResponse.json({ success: false, error: 'clientId e scenario sono obbligatori' }, { status: 400 })
    }

    const result = await generateEmail({ clientId, scenario, customPrompt })
    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/email-generate]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione email' }, { status: 500 })
  }
}
