import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { recalculateAllHealthScores } from '@/lib/crm/health-score'

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && auth === `Bearer ${cronSecret}`
    const userRole = request.headers.get('x-user-role')
    if (!isCron && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    if (!rateLimit('health-recalculate', 1, 300000).allowed) {
      return NextResponse.json({ error: 'Ricalcolo già in corso. Riprova tra 5 minuti.' }, { status: 429 })
    }

    const result = await recalculateAllHealthScores()

    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[crm/health/recalculate]', e)
    return NextResponse.json({ error: 'Errore nel ricalcolo health scores' }, { status: 500 })
  }
}
