import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { processTouchpointRules } from '@/lib/crm/touchpoint-engine'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && auth === `Bearer ${cronSecret}`
    const userRole = request.headers.get('x-user-role')
    if (!isCron && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    if (!rateLimit('touchpoint-process', 1, 300000).allowed) {
      return NextResponse.json({ error: 'Elaborazione già in corso.' }, { status: 429 })
    }

    const result = await processTouchpointRules()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[touchpoints/process]', e)
    return NextResponse.json({ error: 'Errore nell\'elaborazione touchpoint' }, { status: 500 })
  }
}
