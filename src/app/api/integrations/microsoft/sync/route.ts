import { NextRequest, NextResponse } from 'next/server'
import { pullFromMicrosoftTodo, syncAllMicrosoftUsers, initialSyncToMicrosoftTodo } from '@/lib/microsoft-sync'
import { renewWebhookSubscription } from '@/lib/microsoft-graph'
import { prisma } from '@/lib/prisma'

// POST /api/integrations/microsoft/sync
// Manual sync trigger or cron endpoint
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')

  // If called with a secret key (for cron), sync all users
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret === process.env.CRON_SECRET) {
    await syncAllMicrosoftUsers()

    // Renew expiring webhooks
    const expiringTokens = await prisma.microsoftToken.findMany({
      where: {
        webhookExpiry: { lt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // expiring within 24h
        webhookSubId: { not: null },
      },
      select: { userId: true },
    })
    for (const token of expiringTokens) {
      await renewWebhookSubscription(token.userId).catch(() => {})
    }

    return NextResponse.json({ success: true, syncedUsers: 'all' })
  }

  // User-initiated manual sync
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // Push all unsyncyed tasks to To Do, then pull changes back
  const pushed = await initialSyncToMicrosoftTodo(userId)
  const pulled = await pullFromMicrosoftTodo(userId)
  return NextResponse.json({ success: true, tasksPushed: pushed, changesPulled: pulled })
}
