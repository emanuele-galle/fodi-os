import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteWebhookSubscription } from '@/lib/microsoft-graph'

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    // Delete webhook subscription first
    await deleteWebhookSubscription(userId).catch(() => {})

    // Delete token
    await prisma.microsoftToken.delete({ where: { userId } }).catch(() => {})

    // Clear microsoftTodoId from tasks (optional: keep them for reference)
    // We leave them so if user reconnects, the mapping is preserved

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[microsoft/disconnect]', e)
    return NextResponse.json({ error: 'Errore disconnessione' }, { status: 500 })
  }
}
