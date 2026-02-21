import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role')

    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo gli admin possono impersonificare' }, { status: 403 })
    }

    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId obbligatorio' }, { status: 400 })
    }

    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Non puoi impersonificare te stesso' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true, role: true, isActive: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    if (!target.isActive) {
      return NextResponse.json({ error: 'Utente non attivo' }, { status: 400 })
    }

    const cookieStore = await cookies()
    cookieStore.set('fodi_impersonate', targetUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour max
    })

    return NextResponse.json({
      success: true,
      target: { id: target.id, name: `${target.firstName} ${target.lastName}`, role: target.role },
    })
  } catch (error) {
    console.error('[admin/impersonate/POST]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    const impersonateCookie = request.cookies.get('fodi_impersonate')?.value

    // Allow if currently impersonating (cookie exists) or if admin
    if (role !== 'ADMIN' && !impersonateCookie) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const cookieStore = await cookies()
    cookieStore.delete('fodi_impersonate')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/impersonate/DELETE]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
