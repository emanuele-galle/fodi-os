import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore hex non valido')

const brandSchema = z.object({
  colorPrimary: hexColor.optional(),
  colorPrimaryDark: hexColor.optional(),
  gradientStart: hexColor.optional(),
  gradientMid: hexColor.optional(),
  gradientEnd: hexColor.optional(),
})

export async function GET() {
  try {
    const settings = await prisma.brandSettings
      .findUnique({ where: { id: 'singleton' } })
      .catch(() => null)
    return NextResponse.json(settings)
  } catch (e) {
    console.error('[brand-settings] GET', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = brandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const settings = await prisma.brandSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...parsed.data },
      update: parsed.data,
    })

    revalidatePath('/', 'layout')

    return NextResponse.json(settings)
  } catch (e) {
    console.error('[brand-settings] PUT', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    await prisma.brandSettings
      .delete({ where: { id: 'singleton' } })
      .catch(() => null)

    revalidatePath('/', 'layout')

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[brand-settings] DELETE', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
