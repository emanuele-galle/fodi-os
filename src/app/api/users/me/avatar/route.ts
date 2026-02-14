import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFile, deleteFile } from '@/lib/s3'
import sharp from 'sharp'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const AVATAR_SIZE = 256
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato non supportato. Usa JPG, PNG, WebP o GIF.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Immagine troppo grande (max 5MB)' }, { status: 400 })
    }

    // Resize to 256x256 with sharp
    const buffer = Buffer.from(await file.arrayBuffer())
    const resized = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer()

    // Delete old avatar if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })
    if (currentUser?.avatarUrl) {
      const oldKey = extractS3Key(currentUser.avatarUrl)
      if (oldKey) {
        await deleteFile(oldKey).catch(() => {})
      }
    }

    // Upload new avatar
    const key = `avatars/${userId}/${Date.now()}.webp`
    const fileUrl = await uploadFile(key, resized, 'image/webp')

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('[users/me/avatar/POST]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })

    if (currentUser?.avatarUrl) {
      const key = extractS3Key(currentUser.avatarUrl)
      if (key) {
        await deleteFile(key).catch(() => {})
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('[users/me/avatar/DELETE]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

function extractS3Key(url: string): string | null {
  try {
    const bucket = process.env.S3_BUCKET!
    const idx = url.indexOf(`/${bucket}/`)
    if (idx === -1) return null
    return url.slice(idx + bucket.length + 2)
  } catch {
    return null
  }
}
