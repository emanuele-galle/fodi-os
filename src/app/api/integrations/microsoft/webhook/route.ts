import { NextRequest, NextResponse } from 'next/server'
import { handleMicrosoftWebhook } from '@/lib/microsoft-sync'

// POST /api/integrations/microsoft/webhook
// Receives change notifications from Microsoft Graph
export async function POST(request: NextRequest) {
  // Microsoft Graph sends a validation request on subscription creation
  const validationToken = request.nextUrl.searchParams.get('validationToken')
  if (validationToken) {
    if (!/^[a-zA-Z0-9_\-]{1,512}$/.test(validationToken)) {
      return new NextResponse('Invalid validation token', { status: 400 })
    }
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  try {
    const body = await request.json()
    const notifications = body?.value as Array<{
      subscriptionId: string
      changeType: string
      resource: string
      resourceData?: { id?: string }
      clientState?: string
    }>

    if (!notifications?.length) {
      return NextResponse.json({ success: true })
    }

    // Process notifications in background (respond quickly to Microsoft)
    for (const notification of notifications) {
      // Verify clientState starts with our prefix
      if (!notification.clientState?.startsWith('ms-todo-')) continue

      handleMicrosoftWebhook(
        notification.subscriptionId,
        notification.resourceData || {},
        notification.changeType
      ).catch((err) => {
        console.error('[microsoft/webhook] Handler error:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[microsoft/webhook]', e)
    return NextResponse.json({ success: true }) // Always 200 to avoid Microsoft retries
  }
}
