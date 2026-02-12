import { NextRequest, NextResponse } from 'next/server'

// Preferences are stored client-side in localStorage.
// This endpoint exists to prevent 404 errors from the useUserPreferences hook.
// In a future version, preferences could be persisted server-side by adding
// a "preferences Json?" field to the User model in the Prisma schema.

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const body = await request.json()
    // Acknowledge the preferences update (stored client-side)
    return NextResponse.json({ saved: true, ...body })
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }
}
