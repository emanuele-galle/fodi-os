import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/s3'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon',
])
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role')
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null // 'logo-dark' | 'logo-light' | 'favicon'

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }
    if (!type || !['logo-dark', 'logo-light', 'favicon'].includes(type)) {
      return NextResponse.json({ error: 'Tipo non valido (logo-dark, logo-light, favicon)' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Formato non supportato. Usa PNG, JPG, SVG o WebP.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 2MB)' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `brand/${type}.${ext}`
    const fileUrl = await uploadFile(key, buffer, file.type)

    revalidatePath('/', 'layout')

    return NextResponse.json({ fileUrl }, { status: 201 })
  } catch (e) {
    console.error('[brand-settings/upload]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
