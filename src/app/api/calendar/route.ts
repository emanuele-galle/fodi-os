import { NextRequest, NextResponse } from 'next/server'
import { getCalendarService, checkAuthStatus, withRetry, isScopeError } from '@/lib/google'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

// GET /api/calendar - List user's calendars
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[calendar]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const { client: auth, error: authError } = await checkAuthStatus(userId)
  if (!auth) {
    return NextResponse.json({
      error: authError === 'scopes' ? 'Permessi calendario insufficienti. Riconnetti Google.' : 'Google non connesso',
      connected: false,
      reason: authError,
    }, { status: 403 })
  }

  try {
    const calendar = getCalendarService(auth)
    const res = await withRetry(() => calendar.calendarList.list())

    const calendars = (res.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }))

    return NextResponse.json({ calendars })
  } catch (e) {
    if (isScopeError(e)) {
      await prisma.googleToken.delete({ where: { userId } }).catch(() => {})
      return NextResponse.json({
        error: 'Permessi calendario insufficienti. Riconnetti Google.',
        connected: false,
        reason: 'scopes',
      }, { status: 403 })
    }
    console.error('Calendar list error:', e)
    return NextResponse.json({ error: 'Errore nel recupero calendari' }, { status: 500 })
  }
}
